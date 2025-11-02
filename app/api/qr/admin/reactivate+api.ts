import { supabaseServer as supabase } from '@/lib/supabase-server';
import { rateLimitOk } from '@/lib/bsl/rateLimit';

// Admin tiers: superAdmin > admin > moderator
async function isAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .in('role', ['superAdmin', 'admin', 'moderator'])
      .maybeSingle();
    
    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
    
    return !!data;
  } catch {
    return false;
  }
}

async function getAuthUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * POST /api/qr/admin/reactivate - Reactivate a QR code (admin only)
 */
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimitOk(`qr-admin:${ip}`)) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429 });
  }

  const userId = await getAuthUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const isUserAdmin = await isAdmin(userId);
  if (!isUserAdmin) {
    return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403 });
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token is required' }), { status: 400 });
    }

    const { data, error } = await supabase
      .rpc('reactivate_qr_code', {
        p_token: token,
        p_admin_user_id: userId,
      })
      .single();

    if (error) {
      console.error('Error reactivating QR:', error);
      return new Response(JSON.stringify({ error: 'Failed to reactivate QR code' }), { status: 500 });
    }

    return new Response(JSON.stringify({ 
      success: data,
      message: 'QR code reactivated successfully' 
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Unexpected error:', e);
    return new Response(JSON.stringify({ error: 'Unexpected server error' }), { status: 500 });
  }
}

