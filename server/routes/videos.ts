import crypto from 'crypto';
import { Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

import type { ErrorResponse } from '../types.js';

import { all, get, run, TvModeSettingRow, VideoRow } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';
import {
  ALLOWED_VIDEO_EXTENSIONS,
  containsExecutableBinarySignature,
  isDangerousExecutableExtension,
  isPermittedVideoExtension,
  isPermittedVideoMime,
  validateVideoMagicBytes,
} from '../utils/fileValidation.js';
import { validateVideoTitle } from '../utils/inputSanitizer.js';
import {
  generateVideoStreamTicket,
  verifyVideoStreamTicket,
} from '../utils/videoStreamTicket.js';

const UPLOADS_DIR = path.resolve(process.env.VIDEO_UPLOADS_DIR || 'uploads/videos');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    let ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_VIDEO_EXTENSIONS.has(ext)) {
      ext = '.mp4';
    }
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    // Check 1: Explicit block on dangerous executable extensions (Finding 11)
    if (isDangerousExecutableExtension(ext)) {
      cb(new Error(`Security Violation: Uploading executable or script files (${ext}) is strictly forbidden.`));
      return;
    }

    // Check 2: Extension and MIME whitelist
    if (!isPermittedVideoExtension(file.originalname) || !isPermittedVideoMime(file.mimetype)) {
      cb(new Error('Invalid video format. Only approved video files (.mp4, .webm, .mov, .ogg) are allowed.'));
      return;
    }

    cb(null, true);
  },
  limits: { fileSize: MAX_VIDEO_SIZE },
  storage,
});

const router = Router();

const videoUploadLimiter = rateLimit({
  handler: (req, res) => {
    const adminEmail = (req as AuthenticatedRequest).user?.email || 'anonymous';
    logSecurityEvent('RATE_LIMIT_EXCEEDED', {
      callerEmail: adminEmail,
      ip: req.ip,
      path: req.originalUrl,
      requestId: (req as AuthenticatedRequest).requestId,
      windowMs: 15 * 60 * 1000,
    });

    return res.status(429).json({
      error: 'Upload rate limit exceeded. You can only upload up to 5 videos every 15 minutes. Please try again later.',
    });
  },
  keyGenerator: (req) => {
    const adminEmail = (req as AuthenticatedRequest).user?.email || 'anonymous';
    const clientIp = ipKeyGenerator(req.ip || '');
    return `upload_video_${adminEmail}_${clientIp}`;
  },
  legacyHeaders: false,
  max: 5,
  message: {
    error: 'Upload rate limit exceeded. You can only upload up to 5 videos every 15 minutes. Please try again later.',
  },
  standardHeaders: true,
  windowMs: 15 * 60 * 1000,
});

function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: () => void) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Super Admin access required' });
  }

  next();
}

export interface ManagedVideoWithTicket extends VideoRow {
  streamTicket?: null | string;
}

type TvModeActiveResponseBody = { video: null | ManagedVideoWithTicket };

router.get('/tvmode-active', async (req: AuthenticatedRequest, res: Response<TvModeActiveResponseBody>) => {
  try {
    const setting = await get<TvModeSettingRow>('SELECT * FROM tvmode_settings WHERE id = 1');

    if (!setting?.activeVideoId) {
      return res.json({ video: null });
    }

    const video = await get<VideoRow>('SELECT * FROM videos WHERE id = ?', [setting.activeVideoId]);

    if (!video) {
      return res.json({ video: null });
    }

    const videoWithTicket: ManagedVideoWithTicket = { ...video };
    // Attach 1-hour signed stream ticket for active TV mode promotional display
    if (video.sourceType === 'upload') {
      const userContext = req.user || { email: 'store@titan.in', role: 'store' };
      videoWithTicket.streamTicket = generateVideoStreamTicket(video.id, userContext, 3600);
    }

    return res.json({ video: videoWithTicket });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Fetch TV Mode active video error', {
      errorMessage: error.message,
      requestId: req.requestId,
    });

    return res.status(500).json({ video: null });
  }
});

// VAPT Finding 23: Issue short-lived, signed stream ticket after role and permission validation
router.get('/:id/ticket', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    const video = await get<VideoRow>('SELECT * FROM videos WHERE id = ?', [id]);
    if (!video || video.sourceType !== 'upload') {
      return res.status(404).json({ error: 'Video not found' });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // RBAC: super_admin and admin can request tickets for any video
    // store can ONLY request ticket for the active TV mode video
    if (user.role === 'store') {
      const setting = await get<TvModeSettingRow>('SELECT * FROM tvmode_settings WHERE id = 1');
      if (setting?.activeVideoId !== id) {
        logSecurityEvent('UNAUTHORIZED_VIDEO_TICKET_REQUEST', {
          activeVideoId: setting?.activeVideoId,
          email: user.email,
          ip: req.ip,
          requestId: req.requestId,
          role: user.role,
          targetVideoId: id,
        });

        return res.status(403).json({ error: 'Store accounts can only stream the active TV mode video.' });
      }
    } else if (user.role !== 'super_admin' && user.role !== 'admin') {
      logSecurityEvent('UNAUTHORIZED_VIDEO_TICKET_REQUEST', {
        email: user.email,
        ip: req.ip,
        requestId: req.requestId,
        role: user.role,
        targetVideoId: id,
      });

      return res.status(403).json({ error: 'Unauthorized to stream video content.' });
    }

    const ticket = generateVideoStreamTicket(id, user, 900);

    return res.json({
      expiresIn: 900,
      streamUrl: `/api/videos/${id}/stream?ticket=${ticket}`,
      ticket,
      videoId: id,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Generate video stream ticket error', {
      errorMessage: error.message,
      requestId: req.requestId,
    });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

// VAPT Finding 23: Failure To Restrict URL Access Remediation
// Enforce short-lived, signed stream ticket, RBAC, and download prevention headers
router.get('/:id/stream', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid video ID' });
    }

    // Extract stream ticket from query param, X-Stream-Ticket header, or Authorization header
    let ticket = req.query.ticket as string | undefined;
    if (!ticket && typeof req.headers['x-stream-ticket'] === 'string') {
      ticket = req.headers['x-stream-ticket'];
    }
    if (!ticket && req.headers.authorization?.startsWith('Bearer ')) {
      const bearerVal = req.headers.authorization.slice(7);
      if (bearerVal.includes('.')) {
        ticket = bearerVal;
      }
    }

    // Check 1: If ticket is completely missing, reject direct URL access (VAPT Finding 23)
    if (!ticket) {
      logSecurityEvent('UNAUTHORIZED_VIDEO_ACCESS_ATTEMPT', {
        ip: req.ip,
        path: req.originalUrl,
        reason: 'MISSING_STREAM_TICKET',
        requestId: req.requestId,
        targetVideoId: id,
      });

      return res.status(403).json({
        error: 'Direct access denied. A short-lived, signed stream ticket is required to access video content.',
      });
    }

    // Check 2: Cryptographic validation of stream ticket (HMAC signature, expiry, and video ID match)
    const ticketCheck = verifyVideoStreamTicket(ticket, id);
    if (!ticketCheck.valid || !ticketCheck.payload) {
      logSecurityEvent('INVALID_STREAM_TICKET_ATTEMPT', {
        ip: req.ip,
        path: req.originalUrl,
        reason: ticketCheck.error,
        requestId: req.requestId,
        targetVideoId: id,
      });

      return res.status(403).json({
        error: ticketCheck.error || 'Invalid or expired video stream ticket.',
      });
    }

    const ticketPayload = ticketCheck.payload;

    // Check 3: Role-based access validation
    if (ticketPayload.role === 'store') {
      const setting = await get<TvModeSettingRow>('SELECT * FROM tvmode_settings WHERE id = 1');
      if (setting?.activeVideoId !== id) {
        logSecurityEvent('UNAUTHORIZED_STORE_STREAM_ATTEMPT', {
          activeVideoId: setting?.activeVideoId,
          email: ticketPayload.email,
          ip: req.ip,
          requestId: req.requestId,
          role: ticketPayload.role,
          targetVideoId: id,
        });

        return res.status(403).json({
          error: 'Access denied. Store accounts can only stream the active TV mode video.',
        });
      }
    } else if (ticketPayload.role !== 'super_admin' && ticketPayload.role !== 'admin') {
      logSecurityEvent('UNAUTHORIZED_ROLE_STREAM_ATTEMPT', {
        email: ticketPayload.email,
        ip: req.ip,
        requestId: req.requestId,
        role: ticketPayload.role,
        targetVideoId: id,
      });

      return res.status(403).json({
        error: 'Access denied. Role not authorized to stream videos.',
      });
    }

    const video = await get<VideoRow>('SELECT * FROM videos WHERE id = ?', [id]);

    if (!video || video.sourceType !== 'upload' || !video.storedName || !video.mimeType) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const filePath = path.join(UPLOADS_DIR, video.storedName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Video file missing on server' });
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    // Security headers for video streaming to prevent unauthorized download/caching
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (!range) {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': video.mimeType,
      });

      fs.createReadStream(filePath).pipe(res);
      return;
    }

    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? parseInt(match[1], 10) : 0;
    const end = match?.[2] ? parseInt(match[2], 10) : stat.size - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Type': video.mimeType,
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Stream video error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.use(requireSuperAdmin);

type VideoListResponseBody = ErrorResponse | ManagedVideoWithTicket[];

router.get('/', async (req: AuthenticatedRequest, res: Response<VideoListResponseBody>) => {
  try {
    const rows = await all<VideoRow>('SELECT * FROM videos ORDER BY uploadedAt DESC');
    const user = req.user;

    // Attach short-lived stream ticket for preview playback in admin directory
    const rowsWithTickets: ManagedVideoWithTicket[] = rows.map((row) => {
      if (row.sourceType === 'upload' && user) {
        return {
          ...row,
          streamTicket: generateVideoStreamTicket(row.id, user, 900),
        };
      }
      return { ...row, streamTicket: null };
    });

    return res.json(rowsWithTickets);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Fetch videos error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

type VideoUploadResponseBody = ErrorResponse | ManagedVideoWithTicket;

interface UploadVideoBody {
  title?: string;
}

router.post(
  '/',
  videoUploadLimiter,
  requireSuperAdmin,
  (req: AuthenticatedRequest, res: Response<VideoUploadResponseBody>, next) => {
    upload.single('video')(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';

        return res.status(400).json({ error: message });
      }

      next();
    });
  },
  async (
    req: AuthenticatedRequest<ParamsDictionary, VideoUploadResponseBody, UploadVideoBody>,
    res: Response<VideoUploadResponseBody>
  ) => {
    const file = req.file;

    try {
      if (!file) {
        return res.status(400).json({ error: 'A video file is required' });
      }

      const filePath = path.join(UPLOADS_DIR, file.filename);

      // Deep inspection: Read initial 64 bytes to inspect magic numbers and executable signatures
      let sampleBuffer: Buffer;
      try {
        const fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(64);
        const bytesRead = fs.readSync(fd, buf, 0, 64, 0);
        fs.closeSync(fd);
        sampleBuffer = buf.subarray(0, bytesRead);
      } catch {
        fs.unlink(filePath, () => {});
        return res.status(500).json({ error: 'Failed to inspect uploaded video' });
      }

      // Check 1: Executable signature detection (Windows PE, Linux ELF, scripts)
      if (containsExecutableBinarySignature(sampleBuffer)) {
        fs.unlink(filePath, () => {});
        logSecurityEvent('EXECUTABLE_UPLOAD_ATTEMPT', {
          adminEmail: req.user?.email,
          filename: file.originalname,
          ip: req.ip,
          requestId: req.requestId,
        });

        return res.status(400).json({
          error: 'Security Violation: Uploaded file contains an executable binary signature and was rejected.',
        });
      }

      // Check 2: Container magic bytes validation (MP4, WebM, OGG)
      const magicValidation = validateVideoMagicBytes(sampleBuffer);
      if (!magicValidation) {
        fs.unlink(filePath, () => {});
        logSecurityEvent('INVALID_VIDEO_MAGIC_BYTES_UPLOAD', {
          adminEmail: req.user?.email,
          filename: file.originalname,
          ip: req.ip,
          mime: file.mimetype,
          requestId: req.requestId,
        });

        return res.status(400).json({
          error: 'Invalid file format: File header does not match permitted video container formats (MP4, WebM, MOV, Ogg).',
        });
      }

      const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      const titleToValidate = rawTitle || file.originalname;

      const titleResult = validateVideoTitle(titleToValidate);
      if (!titleResult.valid) {
        fs.unlink(filePath, () => {});
        logSecurityEvent('INVALID_INPUT_SPECIAL_CHARACTERS', {
          callerEmail: req.user?.email,
          field: 'title',
          ip: req.ip,
          reason: titleResult.error,
          requestId: req.requestId,
          valueSnippet: rawTitle.slice(0, 50),
        });

        return res.status(400).json({ error: titleResult.error || 'Invalid video title' });
      }

      const title = titleResult.sanitized!;
      const uploadedBy = req.user?.email || 'admin';
      const uploadedAt = new Date().toISOString();

      const duplicateCutoff = new Date(Date.now() - 60 * 1000).toISOString();
      const existingDuplicate = await get<VideoRow>(
        'SELECT id FROM videos WHERE uploadedBy = ? AND (LOWER(title) = LOWER(?) OR originalName = ?) AND uploadedAt > ?',
        [uploadedBy, title, file.originalname, duplicateCutoff]
      );

      if (existingDuplicate) {
        fs.unlink(filePath, () => {});
        logSecurityEvent('DUPLICATE_VIDEO_UPLOAD_BLOCKED', {
          adminEmail: uploadedBy,
          existingVideoId: existingDuplicate.id,
          filename: file.originalname,
          ip: req.ip,
          requestId: req.requestId,
          title,
        });

        return res.status(409).json({
          error: 'Duplicate video upload detected. A video with this title or filename was uploaded less than 60 seconds ago.',
        });
      }

      const result = await run(
        "INSERT INTO videos (title, sourceType, storedName, originalName, mimeType, size, uploadedBy, uploadedAt) VALUES (?, 'upload', ?, ?, ?, ?, ?, ?)",
        [title, file.filename, file.originalname, file.mimetype, file.size, uploadedBy, uploadedAt]
      );

      const video: ManagedVideoWithTicket = {
        id: Number(result.lastInsertRowid),
        mimeType: file.mimetype,
        originalName: file.originalname,
        size: file.size,
        sourceType: 'upload',
        storedName: file.filename,
        streamTicket: req.user ? generateVideoStreamTicket(Number(result.lastInsertRowid), req.user, 900) : null,
        title,
        uploadedAt,
        uploadedBy,
        youtubeUrl: null,
      };

      broadcastEvent('VIDEO_UPLOADED', { id: video.id, title });
      logSecurityEvent('ADMIN_VIDEO_UPLOADED', {
        adminEmail: uploadedBy,
        requestId: req.requestId,
        target: title,
      });

      return res.status(201).json(video);
    } catch (err) {
      if (file) {
        fs.unlink(path.join(UPLOADS_DIR, file.filename), () => {});
      }

      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Upload video error', { errorMessage: error.message, requestId: req.requestId });

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

interface SetTvModeActiveBody {
  videoId: null | number;
}

type SetTvModeActiveResponseBody = ErrorResponse | TvModeSettingRow;

router.put(
  '/tvmode-active',
  async (
    req: AuthenticatedRequest<ParamsDictionary, SetTvModeActiveResponseBody, SetTvModeActiveBody>,
    res: Response<SetTvModeActiveResponseBody>
  ) => {
    try {
      const videoId = req.body?.videoId ?? null;

      if (videoId !== null) {
        const video = await get<VideoRow>('SELECT id, title FROM videos WHERE id = ?', [videoId]);

        if (!video) {
          return res.status(404).json({ error: 'Video not found' });
        }
      }

      await run(
        'INSERT INTO tvmode_settings (id, activeVideoId) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET activeVideoId = ?',
        [videoId, videoId]
      );

      const adminEmail = req.user?.email || 'admin@gmail.com';

      broadcastEvent('TVMODE_VIDEO_CHANGED', { videoId });
      logSecurityEvent('ADMIN_TVMODE_VIDEO_SET', {
        adminEmail,
        requestId: req.requestId,
        target: String(videoId),
      });

      return res.json({ activeVideoId: videoId, id: 1 });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error('Set TV Mode active video error', {
        errorMessage: error.message,
        requestId: req.requestId,
      });

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

type DeleteVideoResponseBody = ErrorResponse | { ok: true };

router.delete('/:id', async (req: AuthenticatedRequest, res: Response<DeleteVideoResponseBody>) => {
  try {
    const id = Number(req.params.id);
    const video = await get<VideoRow>('SELECT * FROM videos WHERE id = ?', [id]);

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    await run('DELETE FROM videos WHERE id = ?', [id]);

    if (video.storedName) {
      fs.unlink(path.join(UPLOADS_DIR, video.storedName), () => {});
    }

    const setting = await get<TvModeSettingRow>('SELECT * FROM tvmode_settings WHERE id = 1');

    if (setting?.activeVideoId === id) {
      await run('UPDATE tvmode_settings SET activeVideoId = NULL WHERE id = 1');
      broadcastEvent('TVMODE_VIDEO_CHANGED', { videoId: null });
    }

    const adminEmail = req.user?.email || 'admin@gmail.com';

    broadcastEvent('VIDEO_DELETED', { id });
    logSecurityEvent('ADMIN_VIDEO_DELETED', { adminEmail, requestId: req.requestId, target: video.title });

    return res.json({ ok: true });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Delete video error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
