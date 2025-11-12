import { supabaseServer } from '@/lib/supabase-server';
import { sendUserOnboardingEmail, sendSpeakerOnboardingEmail } from '@/lib/email';

/**
 * API endpoint to send onboarding emails to a newly registered user
 * This should be called after welcome email is sent
 * - Sends user onboarding email to all users
 * - Sends speaker onboarding email if user is a speaker
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

    // Skip onboarding emails for wallet addresses (synthetic emails)
    if (email.includes('@wallet.')) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Onboarding emails skipped for wallet address',
          skipped: true
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = supabaseServer();
    const results: {
      userOnboarding?: { success: boolean; alreadySent?: boolean; error?: string };
      speakerOnboarding?: { success: boolean; alreadySent?: boolean; error?: string; isSpeaker?: boolean };
    } = {};

    // 1. Send user onboarding email to all users
    console.log(`📧 Sending user onboarding email to ${email}...`);
    const userOnboardingResult = await sendUserOnboardingEmail(email, locale || 'en', userId);
    results.userOnboarding = userOnboardingResult;

    // 2. Check if user is a speaker
    const { data: speakerData, error: speakerError } = await supabase
      .from('bsl_speakers')
      .select('id, name')
      .eq('user_id', userId)
      .maybeSingle();

    const isSpeaker = !speakerError && speakerData !== null;

    // 3. Send speaker onboarding email if user is a speaker
    if (isSpeaker) {
      console.log(`🎤 User ${userId} is a speaker (${speakerData?.name}), sending speaker onboarding email...`);
      const speakerOnboardingResult = await sendSpeakerOnboardingEmail(email, locale || 'en', userId);
      results.speakerOnboarding = {
        ...speakerOnboardingResult,
        isSpeaker: true
      };
    } else {
      console.log(`ℹ️ User ${userId} is not a speaker, skipping speaker onboarding email`);
      results.speakerOnboarding = {
        success: true,
        isSpeaker: false,
        alreadySent: false
      };
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Onboarding emails processed',
        results
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-onboarding-emails API:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

