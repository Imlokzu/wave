import { Router, Response } from 'express';
import { getSubscriptionManager } from '../managers/SubscriptionManager';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { AuthService } from '../services/AuthService';

export function createSubscriptionRouter(authService: AuthService): Router {
  const router = Router();
  const authMiddleware = requireAuth(authService);

// Get user's subscription status
router.get('/status', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscriptionManager = getSubscriptionManager();
    const subscription = await subscriptionManager.getSubscription(userId);
    const isPro = await subscriptionManager.isPro(userId);

    res.json({
      success: true,
      subscription,
      isPro
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

// Upgrade to Pro
router.post('/upgrade', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscriptionManager = getSubscriptionManager();
    await subscriptionManager.upgradeToPro(userId);

    res.json({
      success: true,
      message: 'Successfully upgraded to Pro'
    });
  } catch (error) {
    console.error('Upgrade to Pro error:', error);
    res.status(500).json({ error: 'Failed to upgrade to Pro' });
  }
});

// Downgrade to Free
router.post('/downgrade', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscriptionManager = getSubscriptionManager();
    await subscriptionManager.downgradeToFree(userId);

    res.json({
      success: true,
      message: 'Successfully downgraded to Free'
    });
  } catch (error) {
    console.error('Downgrade to Free error:', error);
    res.status(500).json({ error: 'Failed to downgrade' });
  }
});

// Check feature access
router.get('/feature/:featureName', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { featureName } = req.params;
    const subscriptionManager = getSubscriptionManager();
    const hasAccess = await subscriptionManager.checkFeatureAccess(userId, featureName);

    res.json({
      success: true,
      hasAccess,
      feature: featureName
    });
  } catch (error) {
    console.error('Check feature access error:', error);
    res.status(500).json({ error: 'Failed to check feature access' });
  }
});

  return router;
}
