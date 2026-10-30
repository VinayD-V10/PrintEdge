import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getSupabaseAdmin, getSupabaseAnon } from '../supabase';
import { config, isSupabaseConfigured } from '../config';
import { AuthenticatedRequest, requireAuth, inMemoryTokens } from '../middleware/auth';
import { User, UserRole } from '../../src/types/printease';

const router = Router();

// In-memory fallbacks when Supabase is not configured
const inMemoryOtps = new Map<string, string>();
const inMemoryUsers = new Map<string, User>();

// Seed default owner and student
const defaultOwner: User = {
  id: 'usr_owner_01',
  name: 'Vinay (PrintEase Owner)',
  email: config.ownerEmail || 'vinay8046d@gmail.com',
  phone: '+91 80887 11191',
  role: 'admin',
  status: 'active',
  created_at: new Date().toISOString(),
  verified: true,
};

const defaultStudent: User = {
  id: 'usr_student_01',
  name: 'Aarav Patel',
  email: 'student@college.edu',
  phone: '+91 91234 56789',
  role: 'customer',
  status: 'active',
  created_at: new Date().toISOString(),
  verified: true,
};

inMemoryUsers.set(defaultOwner.email, defaultOwner);
inMemoryUsers.set(defaultStudent.email, defaultStudent);

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name.length <= 2) return `${name}***@${domain}`;
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

/**
 * POST /api/auth/send-otp
 * Supabase Auth Email OTP dispatch
 */
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (!isSupabaseConfigured()) {
      const generatedOtp = '123456';
      inMemoryOtps.set(cleanEmail, generatedOtp);
      console.log(`[AUTH_DEV_MODE] OTP dispatched for ${cleanEmail}: ${generatedOtp}`);
      res.json({
        success: true,
        message: 'A 6-digit verification code has been dispatched to your email.',
        destination: maskEmail(cleanEmail),
        cooldown_seconds: 30,
      });
      return;
    }

    const supabase = getSupabaseAnon();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (otpError) {
      console.error('[SUPABASE_SEND_OTP_ERROR]', otpError);
      res.status(400).json({ error: otpError.message || 'Failed to send verification OTP.' });
      return;
    }

    res.json({
      success: true,
      message: 'A 6-digit verification code has been dispatched to your email.',
      destination: maskEmail(cleanEmail),
      cooldown_seconds: 30,
    });
  } catch (err: any) {
    console.error('[AUTH_SEND_OTP_ERROR]', err);
    res.status(500).json({ error: err.message || 'An error occurred while sending OTP.' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Verifies Supabase email OTP
 */
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { identifier, otp, purpose, new_password } = req.body;
    const cleanEmail = (identifier || '').trim().toLowerCase();
    const cleanOtp = (otp || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'Valid email address is required for verification.' });
      return;
    }

    if (!cleanOtp || cleanOtp.length < 6) {
      res.status(400).json({ error: 'Please enter the 6-digit verification code.' });
      return;
    }

    if (!isSupabaseConfigured()) {
      const expectedOtp = inMemoryOtps.get(cleanEmail) || '123456';
      if (cleanOtp !== expectedOtp && cleanOtp !== '123456') {
        res.status(400).json({ error: 'That OTP is incorrect. Use 123456 in dev mode.' });
        return;
      }

      const isOwner = cleanEmail === config.ownerEmail || cleanEmail.includes('admin@printease');
      let user = inMemoryUsers.get(cleanEmail);
      if (!user) {
        user = {
          id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: '',
          role: isOwner ? 'admin' : 'customer',
          status: 'active',
          created_at: new Date().toISOString(),
          verified: true,
        };
        inMemoryUsers.set(cleanEmail, user);
      }
      const token = `token_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
      inMemoryTokens.set(token, user);

      res.json({
        success: true,
        message: 'OTP verified successfully.',
        token,
        user,
      });
      return;
    }

    const supabase = getSupabaseAnon();
    const adminSupabase = getSupabaseAdmin();

    const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanOtp,
      type: 'email',
    });

    if (verifyError || !authData.session || !authData.user) {
      console.warn('[SUPABASE_VERIFY_OTP_FAILED]', verifyError);
      res.status(400).json({
        error: verifyError?.message || 'That OTP is incorrect or has expired. Please check your email.',
      });
      return;
    }

    const authUser = authData.user;
    const isOwner = cleanEmail === config.ownerEmail || cleanEmail.includes('admin@printease');

    // Update password if this was a password reset
    if (purpose === 'forgot_password' && new_password) {
      await adminSupabase.auth.admin.updateUserById(authUser.id, {
        password: new_password,
      });
    }

    // Upsert user profile in public.users
    const userRole: UserRole = isOwner ? 'admin' : 'customer';
    const userName = authUser.user_metadata?.name || cleanEmail.split('@')[0];

    const { data: profile } = await adminSupabase
      .from('users')
      .upsert(
        {
          id: authUser.id,
          email: cleanEmail,
          name: userName,
          phone: authUser.phone || '',
          role: userRole,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    const user: User = {
      id: authUser.id,
      name: profile?.name || userName,
      email: cleanEmail,
      phone: profile?.phone || '',
      role: profile?.role || userRole,
      status: 'active',
      created_at: profile?.created_at || new Date().toISOString(),
      verified: true,
    };

    res.json({
      success: true,
      message: 'OTP verified successfully.',
      token: authData.session.access_token,
      user,
    });
  } catch (err: any) {
    console.error('[AUTH_VERIFY_OTP_ERROR]', err);
    res.status(500).json({ error: err.message || 'OTP verification failed.' });
  }
});

/**
 * POST /api/auth/login
 * Password-based authentication
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    const cleanEmail = (identifier || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    if (!isSupabaseConfigured()) {
      const isOwner = cleanEmail === config.ownerEmail || cleanEmail.includes('admin@printease');
      let user = inMemoryUsers.get(cleanEmail);
      if (!user) {
        user = {
          id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: '',
          role: isOwner ? 'admin' : 'customer',
          status: 'active',
          created_at: new Date().toISOString(),
          verified: true,
        };
        inMemoryUsers.set(cleanEmail, user);
      }
      const token = `token_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
      inMemoryTokens.set(token, user);

      res.json({
        success: true,
        token,
        user,
      });
      return;
    }

    const supabase = getSupabaseAnon();
    const adminSupabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data.session || !data.user) {
      res.status(400).json({ error: 'Incorrect email or password. Please try again.' });
      return;
    }

    const authUser = data.user;
    const isOwner = cleanEmail === config.ownerEmail || cleanEmail.includes('admin@printease');

    // Retrieve profile from DB
    const { data: profile } = await adminSupabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    const role: UserRole = profile?.role || (isOwner ? 'admin' : 'customer');

    const user: User = {
      id: authUser.id,
      name: profile?.name || authUser.user_metadata?.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: profile?.phone || '',
      role,
      status: 'active',
      created_at: profile?.created_at || new Date().toISOString(),
      verified: Boolean(authUser.email_confirmed_at),
    };

    res.json({
      success: true,
      token: data.session.access_token,
      user,
    });
  } catch (err: any) {
    console.error('[AUTH_LOGIN_ERROR]', err);
    res.status(500).json({ error: err.message || 'Login failed.' });
  }
});

/**
 * POST /api/auth/signup
 * Customer Sign Up
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!name || !cleanEmail || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    if (!isSupabaseConfigured()) {
      const isOwner = cleanEmail === config.ownerEmail || cleanEmail.includes('admin@printease');
      const user: User = {
        id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        name: name.trim(),
        email: cleanEmail,
        phone: (phone || '').trim(),
        role: isOwner ? 'admin' : 'customer',
        status: 'active',
        created_at: new Date().toISOString(),
        verified: true,
      };
      inMemoryUsers.set(cleanEmail, user);
      inMemoryOtps.set(cleanEmail, '123456');

      res.json({
        success: true,
        message: 'Account created! A verification code has been dispatched to your email.',
        destination: maskEmail(cleanEmail),
        cooldown_seconds: 30,
      });
      return;
    }

    const supabase = getSupabaseAnon();
    const adminSupabase = getSupabaseAdmin();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: name.trim(),
          phone: (phone || '').trim(),
        },
      },
    });

    if (error) {
      res.status(400).json({ error: error.message || 'Sign up failed.' });
      return;
    }

    if (data.user) {
      await adminSupabase.from('users').upsert({
        id: data.user.id,
        email: cleanEmail,
        name: name.trim(),
        phone: (phone || '').trim(),
        role: 'customer',
        status: 'active',
      });
    }

    res.json({
      success: true,
      message: 'Account created! A verification code has been dispatched to your email.',
      destination: maskEmail(cleanEmail),
      cooldown_seconds: 30,
    });
  } catch (err: any) {
    console.error('[AUTH_SIGNUP_ERROR]', err);
    res.status(500).json({ error: err.message || 'Signup failed.' });
  }
});

/**
 * POST /api/auth/login-otp-request
 * Dedicated Owner / Administrator 2FA OTP Request
 */
router.post('/login-otp-request', async (req: Request, res: Response) => {
  try {
    const { identifier, password, role } = req.body;
    const cleanEmail = (identifier || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      res.status(400).json({ error: 'Administrator email and password are required.' });
      return;
    }

    const isDesignatedOwner = cleanEmail === config.ownerEmail || cleanEmail.includes('admin@printease');
    if (!isDesignatedOwner && role === 'admin') {
      res.status(403).json({ error: 'Access denied. Account is not registered as an authorized administrator.' });
      return;
    }

    if (!isSupabaseConfigured()) {
      inMemoryOtps.set(cleanEmail, '123456');
      console.log(`[AUTH_DEV_MODE] Owner OTP for ${cleanEmail}: 123456`);
      res.json({
        success: true,
        message: 'Owner verification OTP dispatched to authorized email.',
        destination: maskEmail(cleanEmail),
        cooldown_seconds: 30,
      });
      return;
    }

    const supabase = getSupabaseAnon();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
    });

    if (otpError) {
      res.status(400).json({ error: otpError.message || 'Failed to dispatch owner OTP.' });
      return;
    }

    res.json({
      success: true,
      message: 'Owner verification OTP dispatched to authorized email.',
      destination: maskEmail(cleanEmail),
      cooldown_seconds: 30,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to request owner OTP.' });
  }
});

/**
 * POST /api/auth/resend-otp
 */
router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    const cleanEmail = (identifier || '').trim().toLowerCase();

    if (!cleanEmail) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    if (!isSupabaseConfigured()) {
      inMemoryOtps.set(cleanEmail, '123456');
      res.json({
        success: true,
        message: 'Fresh verification code dispatched.',
        cooldown_seconds: 30,
      });
      return;
    }

    const supabase = getSupabaseAnon();
    const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail });

    if (error) {
      res.status(400).json({ error: error.message || 'Failed to resend OTP.' });
      return;
    }

    res.json({
      success: true,
      message: 'Fresh verification code dispatched.',
      cooldown_seconds: 30,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Resend OTP failed.' });
  }
});

/**
 * POST /api/auth/forgot-password-otp-request
 */
router.post('/forgot-password-otp-request', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    const cleanEmail = (identifier || '').trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    if (!isSupabaseConfigured()) {
      inMemoryOtps.set(cleanEmail, '123456');
      res.json({
        success: true,
        message: 'Password recovery verification code sent to your email.',
        destination: maskEmail(cleanEmail),
        cooldown_seconds: 30,
      });
      return;
    }

    const supabase = getSupabaseAnon();
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);

    if (error) {
      res.status(400).json({ error: error.message || 'Failed to send recovery code.' });
      return;
    }

    res.json({
      success: true,
      message: 'Password recovery verification code sent to your email.',
      destination: maskEmail(cleanEmail),
      cooldown_seconds: 30,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Password reset request failed.' });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user
 */
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
