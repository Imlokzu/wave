import { IUserManager } from '../managers/IUserManager';
import { User } from '../models/Participant';
import bcrypt from 'bcryptjs';

// Simple in-memory session store (replace with Redis in production)
const sessions = new Map<string, { userId: string; expiresAt: number }>();

export class AuthService {
  constructor(public userManager: IUserManager) {}

  /**
   * Generate a secure session token
   */
  private generateToken(): string {
    return `wave_${Date.now()}_${Math.random().toString(36).substring(2)}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Create a session for a user
   */
  private createSession(userId: string): string {
    const token = this.generateToken();
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days
    sessions.set(token, { userId, expiresAt });
    return token;
  }

  /**
   * Validate a session token
   */
  async validateToken(token: string): Promise<User | null> {
    const session = sessions.get(token);
    if (!session) return null;

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }

    return this.userManager.getUserById(session.userId);
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    // Get user by username
    const user = await this.userManager.getUserByUsername(username);
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Check if user has a password set
    if (!user.passwordHash) {
      throw new Error('User has no password set');
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    // Create session
    const token = this.createSession(user.id);

    // Update last seen
    await this.userManager.updateLastSeen(user.id);

    return { token, user };
  }

  /**
   * Signup a new user
   */
  async signup(username: string, nickname: string, password: string): Promise<{ token: string; user: User }> {
    // Check if username is available
    const isAvailable = await this.userManager.isUsernameAvailable(username);
    if (!isAvailable) {
      throw new Error('Username is already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Register user
    const user = await this.userManager.registerUser(username, nickname, passwordHash);
    if (!user) {
      throw new Error('Failed to register user');
    }

    // Create session
    const token = this.createSession(user.id);

    return { token, user };
  }

  /**
   * Validate session and get user
   */
  async validateSession(token: string): Promise<User | null> {
    return this.validateToken(token);
  }

  /**
   * Destroy a session (logout)
   */
  async destroySession(token: string): Promise<void> {
    sessions.delete(token);
  }
}
