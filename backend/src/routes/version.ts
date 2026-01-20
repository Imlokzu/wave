import { Router, Request, Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

const router = Router();

// Read version from package.json
const getVersion = () => {
  try {
    const packageJson = JSON.parse(
      readFileSync(join(__dirname, '../../package.json'), 'utf-8')
    );
    return packageJson.version;
  } catch (error) {
    return '4.2.0'; // Fallback version
  }
};

/**
 * GET /api/version
 * Get current app version and update information
 */
router.get('/', (req: Request, res: Response) => {
  const version = getVersion();
  
  res.json({
    version: version,
    message: 'New features and improvements available',
    releaseDate: '2025-12-28',
    features: [
      'Enhanced AI chat with web search',
      'Improved music streaming',
      'Better mobile experience',
      'Performance optimizations'
    ]
  });
});

export default router;
