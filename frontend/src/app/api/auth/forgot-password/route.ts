export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createAccessToken } from '@/lib/jwt';

// Simple email sending function (you may want to use a proper email service)
async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${resetToken}`;

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USERNAME) {
    console.log('SMTP not configured. Reset URL:', resetUrl);
    return;
  }

  // For production, implement proper email sending here
  // You could use nodemailer, Resend, SendGrid, etc.
  console.log(`Password reset email would be sent to ${email}`);
  console.log(`Reset URL: ${resetUrl}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { detail: 'Email is required' },
        { status: 400 }
      );
    }

    // Get user by email
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('auth_provider', 'LOCAL')
      .single();

    if (user) {
      // Create reset token (short-lived - 1 hour)
      const resetToken = await createAccessToken(user.id, 60); // 60 minutes

      try {
        await sendPasswordResetEmail(email, resetToken);
      } catch (error) {
        // Log error but don't expose to user
        console.error('Failed to send reset email:', error);
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      message:
        'If an account exists with this email, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
