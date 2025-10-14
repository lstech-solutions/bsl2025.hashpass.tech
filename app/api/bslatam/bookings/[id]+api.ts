import { supabaseServer as supabase } from '@/lib/supabase-server';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing booking id' }), { status: 400 });
  }
  const body = await request.json().catch(() => null);
  if (!body || !['accepted','rejected','cancelled'].includes(body.status)) {
    return new Response(JSON.stringify({ error: 'Invalid status' }), { status: 400 });
  }
  const { data, error } = await supabase
    .from('BSL_Bookings')
    .update({ status: body.status })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) return new Response(JSON.stringify({ error: 'Failed to update booking' }), { status: 500 });
  if (!data) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}


