import { supabaseServer as supabase } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    // Ensure the request has a JSON content-type
    if (request.headers.get('content-type') !== 'application/json') {
      return new Response(
        JSON.stringify({ error: 'Content-Type must be application/json' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = body?.email?.trim();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Please enter a valid email address' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { data: existingSubscriber, error: fetchError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking for existing subscriber:', fetchError);
      throw new Error('Failed to check subscription status');
    }

    if (existingSubscriber) {
      return new Response(
        JSON.stringify({ error: 'This email is already subscribed' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { data, error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert([{ 
        email, 
        subscribed_at: new Date().toISOString(), 
        created_at: new Date().toISOString() 
      }])
      .select();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw new Error('Failed to save subscription');
    }

    return new Response(
      JSON.stringify({ 
        message: 'Successfully subscribed!', 
        data: data?.[0] || null 
      }),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Subscription error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        code: 'SUBSCRIPTION_ERROR'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
