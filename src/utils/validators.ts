/**
 * Validate nickname format (non-empty, trimmed)
 */
export function validateNickname(nickname: string): boolean {
  if (!nickname || typeof nickname !== 'string') {
    return false;
  }
  const trimmed = nickname.trim();
  return trimmed.length > 0;
}

/**
 * Validate room code format (6 alphanumeric characters)
 */
export function validateRoomCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Validate image format
 */
export function validateImageFormat(mimeType: string): boolean {
  const validFormats = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  return validFormats.includes(mimeType.toLowerCase());
}

/**
 * Validate image size (in bytes)
 */
export function validateImageSize(sizeInBytes: number, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return sizeInBytes <= maxSizeBytes;
}

/**
 * Validate message content length
 */
export function validateMessageContent(content: string, maxLength: number = 2000): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }
  return content.length <= maxLength;
}
