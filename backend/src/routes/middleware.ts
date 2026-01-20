import { Request, Response, NextFunction } from 'express';
import { validateNickname, validateRoomCode, validateImageFormat, validateImageSize } from '../utils';

/**
 * Validate nickname in request body
 */
export function validateNicknameMiddleware(req: Request, res: Response, next: NextFunction) {
  const { nickname } = req.body;

  if (!validateNickname(nickname)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_NICKNAME',
        message: 'Nickname is required and cannot be empty or whitespace',
      },
    });
  }

  next();
}

/**
 * Validate room code in request params
 */
export function validateRoomCodeMiddleware(req: Request, res: Response, next: NextFunction) {
  const { code } = req.params;

  if (!validateRoomCode(code)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_ROOM_CODE',
        message: 'Invalid room code format. Must be 6 alphanumeric characters',
      },
    });
  }

  next();
}

/**
 * Validate image upload
 */
export function validateImageMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return res.status(400).json({
      error: {
        code: 'NO_IMAGE',
        message: 'No image file provided',
      },
    });
  }

  // Validate format
  if (!validateImageFormat(req.file.mimetype)) {
    return res.status(400).json({
      error: {
        code: 'INVALID_IMAGE_FORMAT',
        message: 'Invalid image format. Supported: JPEG, PNG, GIF, WebP',
      },
    });
  }

  // Validate size
  if (!validateImageSize(req.file.size)) {
    return res.status(400).json({
      error: {
        code: 'IMAGE_TOO_LARGE',
        message: 'Image size exceeds maximum limit of 5MB',
      },
    });
  }

  next();
}

/**
 * Global error handler
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error:', err);

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File size exceeds maximum limit',
      },
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
      },
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
    },
  });
}

/**
 * 404 handler
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
}
