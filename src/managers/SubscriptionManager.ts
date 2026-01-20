import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface Subscription {
  userId: string;
  tier: 'free' | 'pro';
  startDate: Date;
  endDate?: Date;
  autoRenew: boolean;
}

export class SubscriptionManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getSubscription(userId: string): Promise<Subscription> {
    const { data } = await this.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!data) {
      return {
        userId,
        tier: 'free',
        startDate: new Date(),
        autoRenew: false
      };
    }

    return {
      userId: data.user_id,
      tier: data.tier,
      startDate: new Date(data.start_date),
      endDate: data.end_date ? new Date(data.end_date) : undefined,
      autoRenew: data.auto_renew
    };
  }

  async upgradeToPro(userId: string): Promise<void> {
    await this.supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        tier: 'pro',
        start_date: new Date().toISOString(),
        auto_renew: true
      });
  }

  async downgradeToFree(userId: string): Promise<void> {
    await this.supabase
      .from('subscriptions')
      .update({ tier: 'free' })
      .eq('user_id', userId);
  }

  async isPro(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .rpc('is_pro_user', { p_user_id: userId });
    return data || false;
  }

  async checkFeatureAccess(userId: string, feature: string): Promise<boolean> {
    const isPro = await this.isPro(userId);
    const proFeatures = ['music_upload', 'offline_download', 'advanced_themes'];
    
    if (proFeatures.includes(feature)) {
      return isPro;
    }
    
    return true; // Free features
  }
}

let subscriptionManagerInstance: SubscriptionManager | null = null;

export function initializeSubscriptionManager(
  supabaseUrl: string,
  supabaseKey: string
): SubscriptionManager {
  if (!subscriptionManagerInstance) {
    subscriptionManagerInstance = new SubscriptionManager(supabaseUrl, supabaseKey);
  }
  return subscriptionManagerInstance;
}

export function getSubscriptionManager(): SubscriptionManager {
  if (!subscriptionManagerInstance) {
    throw new Error('SubscriptionManager not initialized');
  }
  return subscriptionManagerInstance;
}
