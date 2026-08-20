import crypto from 'crypto';
import { Response, Router } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import fs from 'fs';
import multer from 'multer';
import path from 'path';

import type { ErrorResponse } from '../types.js';

import { all, get, run, TvModeSettingRow, VideoRow } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logger, logSecurityEvent } from '../utils/logger.js';
import { broadcastEvent } from '../utils/sse.js';

const UPLOADS_DIR = path.resolve(process.env.VIDEO_UPLOADS_DIR || 'uploads/videos');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024; // 1GB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('video/')) {
      cb(new Error('Only video files are allowed'));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: MAX_VIDEO_SIZE },
  storage,
});

const router = Router();

function getFormattedTimestamp(): string {
  return new Date().toLocaleString('en-US', {
    day: 'numeric',
    hour: 'numeric',
    hour12: true,
    minute: '2-digit',
    month: 'short',
    second: '2-digit',
    year: 'numeric',
  });
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: () => void) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

type TvModeActiveResponseBody = { video: null | VideoRow };

router.get('/tvmode-active', async (req: AuthenticatedRequest, res: Response<TvModeActiveResponseBody>) => {
  try {
    const setting = await get<TvModeSettingRow>('SELECT * FROM tvmode_settings WHERE id = 1');

    if (!setting?.activeVideoId) {
      return res.json({ video: null });
    }

    const video = await get<VideoRow>('SELECT * FROM videos WHERE id = ?', [setting.activeVideoId]);

    return res.json({ video: video ?? null });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Fetch TV Mode active video error', {
      errorMessage: error.message,
      requestId: req.requestId,
    });

    return res.status(500).json({ video: null });
  }
});

router.get('/:id/stream', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
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

router.use(requireAdmin);

type VideoListResponseBody = ErrorResponse | VideoRow[];

router.get('/', async (req: AuthenticatedRequest, res: Response<VideoListResponseBody>) => {
  try {
    const rows = await all<VideoRow>('SELECT * FROM videos ORDER BY uploadedAt DESC');

    return res.json(rows);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Fetch videos error', { errorMessage: error.message, requestId: req.requestId });

    return res.status(500).json({ error: 'Internal server error' });
  }
});

type VideoUploadResponseBody = ErrorResponse | VideoRow;

interface UploadVideoBody {
  title?: string;
}

router.post(
  '/',
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

      const rawTitle = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      const title = rawTitle.slice(0, 200) || file.originalname;
      const uploadedBy = req.user?.email || 'admin';
      const uploadedAt = new Date().toISOString();

      const result = await run(
        "INSERT INTO videos (title, sourceType, storedName, originalName, mimeType, size, uploadedBy, uploadedAt) VALUES (?, 'upload', ?, ?, ?, ?, ?, ?)",
        [title, file.filename, file.originalname, file.mimetype, file.size, uploadedBy, uploadedAt]
      );

      const video: VideoRow = {
        id: Number(result.lastInsertRowid),
        mimeType: file.mimetype,
        originalName: file.originalname,
        size: file.size,
        sourceType: 'upload',
        storedName: file.filename,
        title,
        uploadedAt,
        uploadedBy,
        youtubeUrl: null,
      };

      await run(
        'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [
          uploadedBy,
          req.user?.name || 'Admin',
          'VIDEO_UPLOADED',
          title,
          `Uploaded video "${file.originalname}" (${file.size} bytes)`,
          getFormattedTimestamp(),
        ]
      );
      broadcastEvent('ADMIN_LOG_CREATED', { action: 'VIDEO_UPLOADED', target: title });
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
      const adminName = req.user?.name || 'Admin';

      await run(
        'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [
          adminEmail,
          adminName,
          'TVMODE_VIDEO_SET',
          videoId ? String(videoId) : 'none',
          videoId ? `Set TV Mode video to video #${videoId}` : 'Cleared TV Mode video',
          getFormattedTimestamp(),
        ]
      );
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
    const adminName = req.user?.name || 'Admin';

    await run(
      'INSERT INTO admin_logs (adminEmail, adminName, action, target, details, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
      [
        adminEmail,
        adminName,
        'VIDEO_DELETED',
        video.title,
        `Deleted video "${video.originalName || video.youtubeUrl || video.title}"`,
        getFormattedTimestamp(),
      ]
    );
    broadcastEvent('ADMIN_LOG_CREATED', { action: 'VIDEO_DELETED', target: video.title });
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
