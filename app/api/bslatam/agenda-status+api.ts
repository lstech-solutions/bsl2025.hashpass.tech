import { supabaseServer as supabase } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get('eventId') || 'bsl2025';

  try {
    // Get the latest agenda update timestamp from database
    const { data: latestUpdate, error } = await supabase
      .from('event_agenda')
      .select('updated_at')
      .eq('event_id', eventId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Agenda status fetch error:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch agenda status' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get agenda count
    const { count: agendaCount, error: countError } = await supabase
      .from('event_agenda')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (countError) {
      console.error('Agenda count fetch error:', countError);
      return new Response(JSON.stringify({ error: 'Failed to fetch agenda count' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      hasData: (agendaCount || 0) > 0,
      lastUpdated: latestUpdate?.updated_at || null,
      itemCount: agendaCount || 0,
      status: 'available'
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  } catch (e) {
    console.error('Agenda status API error:', e);
    return new Response(JSON.stringify({ 
      error: 'Unexpected server error',
      status: 'error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
