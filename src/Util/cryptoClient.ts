export interface EncryptedEnvelope {
  __encrypted: true;
  ciphertext: string;
  iv: string;
  tag: string;
  timestamp: number;
}

const E2EE_SECRET = import.meta.env.VITE_E2EE_SECRET ?? '';

let _cachedKey: CryptoKey | null = null;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    const byte = bytes[i];

    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }

  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function getClientCryptoKey(): Promise<CryptoKey> {
  if (_cachedKey) {
    return _cachedKey;
  }

  if (!E2EE_SECRET) {
    throw new Error('VITE_E2EE_SECRET is not configured on client.');
  }

  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(E2EE_SECRET);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', secretBytes);

  _cachedKey = await window.crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );

  return _cachedKey;
}

export function isEncryptedEnvelope(value: object | null | undefined): value is EncryptedEnvelope {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const v = value as Record<string, string | number | boolean | undefined>;

  return (
    v.__encrypted === true &&
    typeof v.ciphertext === 'string' &&
    typeof v.iv === 'string' &&
    typeof v.tag === 'string' &&
    typeof v.timestamp === 'number'
  );
}

/**
 * Encrypts an object using Web Crypto API AES-256-GCM.
 */
export async function encryptClientPayload<T extends object>(data: T): Promise<EncryptedEnvelope> {
  const key = await getClientCryptoKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encoder = new TextEncoder();
  const serialized = JSON.stringify(data);
  const encoded = encoder.encode(serialized);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer, tagLength: 128 },
    key,
    encoded
  );

  const encryptedBytes = new Uint8Array(encryptedBuffer);
  const tagBytes = encryptedBytes.slice(encryptedBytes.length - 16);
  const ciphertextBytes = encryptedBytes.slice(0, encryptedBytes.length - 16);

  return {
    __encrypted: true,
    ciphertext: uint8ArrayToBase64(ciphertextBytes),
    iv: uint8ArrayToBase64(iv),
    tag: uint8ArrayToBase64(tagBytes),
    timestamp: Date.now(),
  };
}

/**
 * Decrypts an AES-256-GCM envelope using Web Crypto API.
 */
export async function decryptClientPayload<T extends object>(envelope: EncryptedEnvelope): Promise<T> {
  const key = await getClientCryptoKey();

  const ivBytes = base64ToUint8Array(envelope.iv);
  const ciphertextBytes = base64ToUint8Array(envelope.ciphertext);
  const tagBytes = base64ToUint8Array(envelope.tag);

  const combinedBytes = new Uint8Array(ciphertextBytes.length + tagBytes.length);
  combinedBytes.set(ciphertextBytes, 0);
  combinedBytes.set(tagBytes, ciphertextBytes.length);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes.buffer as ArrayBuffer, tagLength: 128 },
    key,
    combinedBytes.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  const decryptedString = decoder.decode(decryptedBuffer);

  return JSON.parse(decryptedString) as T;
}
