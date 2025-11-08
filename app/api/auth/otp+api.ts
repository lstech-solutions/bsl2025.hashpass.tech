import { supabaseServer as supabase } from '@/lib/supabase-server';
import nodemailer from 'nodemailer';

/**
 * API endpoint to send OTP code via custom email
 * Generates OTP token using Supabase Admin API and sends custom email with a 6-digit code
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Valid email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use Supabase Admin API to generate OTP token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: email.trim(),
    });

    if (linkError || !linkData) {
      console.error('Error generating OTP link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP code' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract token_hash from the generated link
    const linkUrl = new URL(linkData.properties.action_link);
    const tokenHash = linkUrl.searchParams.get('token_hash') || linkUrl.searchParams.get('token');
    
    if (!tokenHash) {
      console.error('Could not extract token from link');
      return new Response(
        JSON.stringify({ error: 'Failed to extract OTP token' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate a 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Clean up expired OTP codes
    await supabase.rpc('cleanup_expired_otp_codes');
    
    // Store the mapping in the database (normalize email to lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    const { error: storeError } = await supabase
      .from('otp_codes')
      .insert({
        email: normalizedEmail,
        code: otpCode,
        token_hash: tokenHash,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      });

    if (storeError) {
      console.error('Error storing OTP code:', storeError);
      // Continue anyway - we'll try to verify using the token_hash directly
    }

    // Send custom email with OTP code using nodemailer
    const emailEnabled = process.env.NODEMAILER_HOST && 
                         process.env.NODEMAILER_PORT && 
                         process.env.NODEMAILER_USER && 
                         process.env.NODEMAILER_PASS && 
                         process.env.NODEMAILER_FROM;

    if (emailEnabled) {
      const smtpHost = process.env.NODEMAILER_HOST || '';
      const isBrevo = smtpHost.includes('brevo.com') || smtpHost.includes('sendinblue.com');
      
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.NODEMAILER_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.NODEMAILER_USER,
          pass: process.env.NODEMAILER_PASS,
        },
        tls: {
          // For Brevo/Sendinblue, allow hostname mismatch but still verify certificate
          rejectUnauthorized: process.env.NODE_ENV === 'production',
          servername: isBrevo ? 'smtp-relay.sendinblue.com' : undefined,
          checkServerIdentity: isBrevo ? () => undefined : undefined,
        },
        requireTLS: true,
      });

      const mailOptions = {
        from: `HashPass <${process.env.NODEMAILER_FROM}>`,
        to: email.trim(),
        subject: 'Your Login Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5;">One-Time Login Code</h2>
            <p>Please enter this code to sign in:</p>
            <div style="background-color: #f3f4f6; border: 2px solid #4f46e5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #4f46e5; font-size: 32px; letter-spacing: 8px; margin: 0;">${otpCode}</h1>
            </div>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in 1 hour.</p>
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #6b7280;">
              © ${new Date().getFullYear()} HashPass. All rights reserved.
            </p>
          </div>
        `,
        text: `One-Time Login Code\n\nPlease enter this code to sign in: ${otpCode}\n\nThis code will expire in 1 hour.\n\nIf you didn't request this code, you can safely ignore this email.`,
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log('OTP email sent successfully to:', email);
      } catch (emailError: any) {
        console.error('Error sending OTP email:', emailError);
        return new Response(
          JSON.stringify({ error: 'Failed to send OTP email' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // If email is not configured, fall back to Supabase's email
      // But this will send a magic link, not an OTP code
      return new Response(
        JSON.stringify({ error: 'Email service not configured. Please configure NODEMAILER settings.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'OTP code sent to email',
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
        } 
      }
    );
  } catch (error: any) {
    console.error('OTP generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send OTP' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
