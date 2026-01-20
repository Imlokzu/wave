import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a 6-character alphanumeric room code
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Generate a UUID
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Get current timestamp
 */
export function getCurrentTimestamp(): Date {
  return new Date();
}

/**
 * Generate a spoof source name for fake messages
 */
export function generateSpoofSource(): string {
  const sources = [
    'Google',
    'Wikipedia',
    'BBC News',
    'CNN',
    'The New York Times',
    'Reuters',
    'Associated Press',
    'NASA',
    'World Health Organization',
    'United Nations'
  ];
  return sources[Math.floor(Math.random() * sources.length)];
}
