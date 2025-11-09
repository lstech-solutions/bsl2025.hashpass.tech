import { supabaseServer } from '@/lib/supabase-server';
import { sendWelcomeEmailToNewUser } from '@/lib/email';

/**
 * API endpoint to send welcome email to a newly registered user
 * This should be called after a user successfully signs in for the first time
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, locale } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Skip welcome email for wallet addresses (synthetic emails)
    if (email.includes('@wallet.')) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Welcome email skipped for wallet address',
          skipped: true
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send welcome email
    const result = await sendWelcomeEmailToNewUser(userId, email, locale);

    if (result.success) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: result.alreadySent 
            ? 'Welcome email already sent' 
            : 'Welcome email sent successfully',
          alreadySent: result.alreadySent
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: result.error || 'Failed to send welcome email'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error in send-welcome-email API:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

