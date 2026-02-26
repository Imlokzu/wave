/**
 * Notification Service
 * Handles desktop notifications and push notifications
 */

class NotificationService {
  constructor() {
    this.enabled = localStorage.getItem('desktopNotifications') === 'true';
    this.permission = null;
  }

  /**
   * Initialize notifications
   */
  async init() {
    if (!('Notification' in window)) {
      console.log('[Notifications] Not supported');
      return false;
    }

    if (this.enabled) {
      await this.requestPermission();
    }

    return true;
  }

  /**
   * Request notification permission
   */
  async requestPermission() {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permission = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Show notification for new message
   */
  show(message) {
    if (!this.enabled) {
      return;
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const senderName = message.senderNickname || message.senderUsername || 'Someone';
    const preview = message.content ? this.truncate(message.content, 100) : 'New message';

    const notification = new Notification('Wave Messenger', {
      body: `${senderName}: ${preview}`,
      icon: '/wavechat.png',
      badge: '/wavechat.png',
      vibrate: [200, 100, 200],
      tag: `message-${message.id}`,
      requireInteraction: true,
      data: {
        url: '/chat.html',
        roomId: message.roomId,
        messageId: message.id,
        senderId: message.senderId,
        senderName: senderName
      }
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }

  /**
   * Show notification for DM
   */
  showDM(message) {
    if (!this.enabled) {
      return;
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    const senderName = message.senderUsername || message.senderNickname || 'Someone';
    const preview = message.content ? this.truncate(message.content, 100) : 'New message';

    const notification = new Notification(`DM from ${senderName}`, {
      body: preview,
      icon: '/wavechat.png',
      badge: '/wavechat.png',
      vibrate: [200, 100, 200],
      tag: `dm-${message.id}`,
      requireInteraction: true,
      data: {
        url: '/chat.html',
        senderId: message.senderId,
        senderName: senderName
      }
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }

  /**
   * Truncate text
   */
  truncate(text, maxLength) {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Enable notifications
   */
  async enable() {
    this.enabled = true;
    localStorage.setItem('desktopNotifications', 'true');
    await this.requestPermission();
  }

  /**
   * Disable notifications
   */
  disable() {
    this.enabled = false;
    localStorage.setItem('desktopNotifications', 'false');
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled() {
    return this.enabled && Notification.permission === 'granted';
  }
}

// Export singleton instance
export const notifications = new NotificationService();
