import path from 'path';

export interface ImageValidationResult {
  detectedMime: string;
  extension: string;
  isValid: boolean;
}

export const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
export const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Checks whether the declared extension is allowed.
 */
export function isPermittedImageExtension(filename: string): boolean {
  let ext = path.extname(filename).toLowerCase();
  if (!ext && filename.startsWith('.')) {
    ext = filename.toLowerCase();
  }
  return ALLOWED_IMAGE_EXTENSIONS.has(ext);
}

/**
 * Checks whether the declared MIME type is allowed.
 */
export function isPermittedImageMime(mime: string): boolean {
  return ALLOWED_IMAGE_MIMES.has(mime.toLowerCase());
}

/**
 * Inspects binary magic numbers (file signature) to detect authentic raster image formats.
 * Defeats extension/MIME spoofing (e.g., SVG or HTML renamed to .jpg).
 */
export function validateImageMagicBytes(buffer: Buffer): ImageValidationResult | null {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { detectedMime: 'image/jpeg', extension: '.jpg', isValid: true };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { detectedMime: 'image/png', extension: '.png', isValid: true };
  }

  // 3. WebP: RIFF (bytes 0-3) ... WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { detectedMime: 'image/webp', extension: '.webp', isValid: true };
  }

  return null;
}

/**
 * Scans initial bytes for active XML, HTML, or SVG script tags that could be used for Stored XSS.
 */
export function containsActiveScriptContent(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  const sampleSize = Math.min(buffer.length, 4096);
  const sample = buffer.subarray(0, sampleSize).toString('utf-8').toLowerCase();

  const dangerousPatterns = [
    '<svg',
    '</svg',
    '<script',
    '</script',
    '<?xml',
    '<!doctype',
    '<html',
    '<body',
    'onload=',
    'onerror=',
    'onclick=',
    'onmouseover=',
    'onfocus=',
    'javascript:',
    'xlink:href',
    'data:text/html',
    'xmlns="http://www.w3.org/2000/svg"',
  ];

  return dangerousPatterns.some((pattern) => sample.includes(pattern));
}

// -----------------------------------------------------------------------------
// Video File Upload & Executable Hardening (VAPT Finding 11)
// -----------------------------------------------------------------------------

export const ALLOWED_VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.ogg', '.ogv']);
export const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']);

export const DANGEROUS_EXECUTABLE_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.sh',
  '.dll',
  '.com',
  '.scr',
  '.msi',
  '.pif',
  '.vbs',
  '.vbe',
  '.js',
  '.jse',
  '.wsf',
  '.wsh',
  '.ps1',
  '.php',
  '.phtml',
  '.php3',
  '.php4',
  '.php5',
  '.phps',
  '.jsp',
  '.jspx',
  '.asp',
  '.aspx',
  '.cgi',
  '.pl',
  '.py',
  '.jar',
  '.war',
]);

/**
 * Checks whether the declared file extension is an allowed video format.
 */
export function isPermittedVideoExtension(filename: string): boolean {
  let ext = path.extname(filename).toLowerCase();
  if (!ext && filename.startsWith('.')) {
    ext = filename.toLowerCase();
  }
  return ALLOWED_VIDEO_EXTENSIONS.has(ext);
}

/**
 * Checks whether the declared MIME type is an allowed video format.
 */
export function isPermittedVideoMime(mime: string): boolean {
  return ALLOWED_VIDEO_MIMES.has(mime.toLowerCase());
}

/**
 * Detects whether the file extension is a dangerous executable or script type.
 */
export function isDangerousExecutableExtension(filename: string): boolean {
  let ext = path.extname(filename).toLowerCase();
  if (!ext && filename.startsWith('.')) {
    ext = filename.toLowerCase();
  }
  return DANGEROUS_EXECUTABLE_EXTENSIONS.has(ext);
}

/**
 * Checks raw file header bytes for executable signatures (Windows PE, Linux ELF, shell shebang, script tags).
 */
export function containsExecutableBinarySignature(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 2) {
    return false;
  }

  // Windows PE Executable (MZ header)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return true;
  }

  // Linux ELF Executable (\x7FELF)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x7f &&
    buffer[1] === 0x45 &&
    buffer[2] === 0x4c &&
    buffer[3] === 0x46
  ) {
    return true;
  }

  // Unix shell shebang (#! /bin/...)
  if (buffer[0] === 0x23 && buffer[1] === 0x21) {
    return true;
  }

  // Script tags in initial sample
  const sample = buffer.subarray(0, Math.min(buffer.length, 512)).toString('utf-8').toLowerCase();
  if (
    sample.includes('<?php') ||
    sample.includes('<%') ||
    sample.includes('<script') ||
    sample.includes('wscript.shell')
  ) {
    return true;
  }

  return false;
}

export interface VideoValidationResult {
  detectedMime: string;
  extension: string;
  isValid: boolean;
}

/**
 * Inspects container magic bytes to confirm authentic video container formats.
 */
export function validateVideoMagicBytes(buffer: Buffer): VideoValidationResult | null {
  if (!buffer || buffer.length < 8) {
    return null;
  }

  // If executable signature is present, reject immediately
  if (containsExecutableBinarySignature(buffer)) {
    return null;
  }

  // 1. MP4 / MOV (ISO base media box: offset 4-7 has 'ftyp', 'moov', 'mdat', 'wide')
  const boxType = buffer.toString('ascii', 4, 8);
  if (['ftyp', 'moov', 'mdat', 'wide'].includes(boxType)) {
    return { detectedMime: 'video/mp4', extension: '.mp4', isValid: true };
  }

  // 2. WebM / Matroska (EBML ID: 0x1A 0x45 0xDF 0xA3)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x1a &&
    buffer[1] === 0x45 &&
    buffer[2] === 0xdf &&
    buffer[3] === 0xa3
  ) {
    return { detectedMime: 'video/webm', extension: '.webm', isValid: true };
  }

  // 3. Ogg Video (OggS: 0x4F 0x67 0x67 0x53)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return { detectedMime: 'video/ogg', extension: '.ogg', isValid: true };
  }

  return null;
}
