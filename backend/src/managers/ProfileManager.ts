import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface UserProfile {
  userId: string;
  bio?: string;
  socialLinks: { platform: string; url: string }[];
  badges: string[];
  themeSettings: {
    primaryColor: string;
    accentColor: string;
  };
  profileEffects: string[];
  bannerUrl?: string;
  avatarUrl?: string;
  updatedAt: Date;
}

export class ProfileManager {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Create default profile if doesn't exist
        return await this.createDefaultProfile(userId);
      }

      return {
        userId: data.user_id,
        bio: data.bio,
        socialLinks: data.social_links || [],
        badges: data.badges || [],
        themeSettings: data.theme_settings || {
          primaryColor: '#3b82f6',
          accentColor: '#06b6d4'
        },
        profileEffects: data.profile_effects || [],
        bannerUrl: data.banner_url,
        avatarUrl: data.avatar_url,
        updatedAt: new Date(data.updated_at)
      };
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  /**
   * Create default profile
   */
  private async createDefaultProfile(userId: string): Promise<UserProfile> {
    const defaultProfile = {
      user_id: userId,
      bio: '',
      social_links: [],
      badges: [],
      theme_settings: {
        primaryColor: '#3b82f6',
        accentColor: '#06b6d4'
      },
      profile_effects: []
    };

    await this.supabase
      .from('user_profiles')
      .insert(defaultProfile);

    return {
      userId,
      bio: '',
      socialLinks: [],
      badges: [],
      themeSettings: {
        primaryColor: '#3b82f6',
        accentColor: '#06b6d4'
      },
      profileEffects: [],
      updatedAt: new Date()
    };
  }

  /**
   * Update bio
   */
  async updateBio(userId: string, bio: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          bio,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      console.log(`Bio updated for user ${userId}`);
    } catch (error) {
      console.error('Failed to update bio:', error);
      throw error;
    }
  }

  /**
   * Add social link
   */
  async addSocialLink(userId: string, platform: string, url: string): Promise<void> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const socialLinks = [...profile.socialLinks];
      
      // Remove existing link for same platform
      const existingIndex = socialLinks.findIndex(link => link.platform === platform);
      if (existingIndex >= 0) {
        socialLinks.splice(existingIndex, 1);
      }

      // Add new link
      socialLinks.push({ platform, url });

      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          social_links: socialLinks,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log(`Social link added for user ${userId}: ${platform}`);
    } catch (error) {
      console.error('Failed to add social link:', error);
      throw error;
    }
  }

  /**
   * Remove social link
   */
  async removeSocialLink(userId: string, platform: string): Promise<void> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const socialLinks = profile.socialLinks.filter(link => link.platform !== platform);

      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          social_links: socialLinks,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log(`Social link removed for user ${userId}: ${platform}`);
    } catch (error) {
      console.error('Failed to remove social link:', error);
      throw error;
    }
  }

  /**
   * Add badge
   */
  async addBadge(userId: string, badgeId: string): Promise<void> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const badges = [...profile.badges];
      
      // Don't add duplicate badges
      if (badges.includes(badgeId)) {
        return;
      }

      badges.push(badgeId);

      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          badges,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log(`Badge added for user ${userId}: ${badgeId}`);
    } catch (error) {
      console.error('Failed to add badge:', error);
      throw error;
    }
  }

  /**
   * Update theme
   */
  async updateTheme(
    userId: string,
    theme: { primaryColor: string; accentColor: string }
  ): Promise<void> {
    try {
      // Validate colors are blue/cyan shades
      if (!this.isValidWaveColor(theme.primaryColor) || !this.isValidWaveColor(theme.accentColor)) {
        throw new Error('Theme colors must be blue or cyan shades');
      }

      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          theme_settings: theme,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log(`Theme updated for user ${userId}`);
    } catch (error) {
      console.error('Failed to update theme:', error);
      throw error;
    }
  }

  /**
   * Validate color is blue/cyan shade
   */
  private isValidWaveColor(color: string): boolean {
    // Simple validation - check if hex color contains more blue than red/green
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Blue should be dominant or cyan (blue + green)
    return b > r || (b > 150 && g > 150);
  }

  /**
   * Update avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log(`Avatar updated for user ${userId}`);
    } catch (error) {
      console.error('Failed to update avatar:', error);
      throw error;
    }
  }

  /**
   * Update banner
   */
  async updateBanner(userId: string, bannerUrl: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          banner_url: bannerUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log(`Banner updated for user ${userId}`);
    } catch (error) {
      console.error('Failed to update banner:', error);
      throw error;
    }
  }

  /**
   * Add profile effect
   */
  async addProfileEffect(userId: string, effectId: string): Promise<void> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const effects = [...profile.profileEffects];
      
      if (!effects.includes(effectId)) {
        effects.push(effectId);
      }

      const { error } = await this.supabase
        .from('user_profiles')
        .update({
          profile_effects: effects,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      console.log(`Profile effect added for user ${userId}: ${effectId}`);
    } catch (error) {
      console.error('Failed to add profile effect:', error);
      throw error;
    }
  }
}

// Export singleton instance
let profileManagerInstance: ProfileManager | null = null;

export function initializeProfileManager(
  supabaseUrl: string,
  supabaseKey: string
): ProfileManager {
  if (!profileManagerInstance) {
    profileManagerInstance = new ProfileManager(supabaseUrl, supabaseKey);
  }
  return profileManagerInstance;
}

export function getProfileManager(): ProfileManager {
  if (!profileManagerInstance) {
    throw new Error('ProfileManager not initialized. Call initializeProfileManager first.');
  }
  return profileManagerInstance;
}
