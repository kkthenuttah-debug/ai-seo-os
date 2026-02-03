import { createClient } from '@supabase/supabase-js';
import { env } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { AuthError } from '../utils/errors.js';

interface User {
  id: string;
  email: string;
  userId: string;
}

interface SignUpInput {
  email: string;
  password: string;
  company_name?: string;
}

interface SignInInput {
  email: string;
  password: string;
}

class AuthService {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_ANON_KEY
    );
  }

  async signup(input: SignUpInput) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: input.email,
        password: input.password,
      });

      if (error) {
        logger.warn({ error }, 'Signup error');
        throw new AuthError('Signup failed');
      }

      if (data.user) {
        const { error: insertError } = await this.supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: input.email,
            auth_id: data.user.id,
            company_name: input.company_name,
          });

        if (insertError) {
          logger.error({ error: insertError }, 'Failed to create user record');
          throw new AuthError('User creation failed');
        }
      }

      logger.info({ email: input.email }, 'User signed up');
      return data;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      logger.error({ error }, 'Signup failed');
      throw new AuthError('Signup failed');
    }
  }

  async signIn(input: SignInInput) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      if (error) {
        logger.warn({ error }, 'Sign in error');
        throw new AuthError('Invalid credentials');
      }

      logger.info({ email: input.email }, 'User signed in');
      return data;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      logger.error({ error }, 'Sign in failed');
      throw new AuthError('Sign in failed');
    }
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase.auth.getUser(token);

      if (error || !data.user) {
        return null;
      }

      return {
        id: data.user.id,
        email: data.user.email || '',
        userId: data.user.id,
      };
    } catch (error) {
      logger.error({ error }, 'Token verification failed');
      return null;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        throw new AuthError('Token refresh failed');
      }

      return data;
    } catch (error) {
      if (error instanceof AuthError) throw error;
      logger.error({ error }, 'Token refresh failed');
      throw new AuthError('Token refresh failed');
    }
  }

  async signOut(userId: string) {
    try {
      await this.supabase.auth.signOut();
      logger.info({ userId }, 'User signed out');
    } catch (error) {
      logger.error({ error }, 'Sign out failed');
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        userId: data.auth_id,
      };
    } catch (error) {
      logger.error({ error }, 'Failed to get user by email');
      return null;
    }
  }
}

export const authService = new AuthService();
