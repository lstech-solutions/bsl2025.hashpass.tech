import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUserPass() {
  try {
    // First, get the user ID for ecalderon@unal.edu.co
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }

    const testUser = users.users.find(user => user.email === 'ecalderon@unal.edu.co');
    
    if (!testUser) {
      console.error('User ecalderon@unal.edu.co not found');
      return;
    }

    console.log('Found user:', testUser.id, testUser.email);

    // Create a pass for the user
    const passData = {
      id: `test-pass-${Date.now()}`,
      user_id: testUser.id,
      event_id: 'bsl2025',
      pass_type: 'business',
      status: 'active',
      purchase_date: new Date().toISOString(),
      price_usd: 0.00,
      access_features: ['all_sessions', 'networking', 'business_events'],
      max_meeting_requests: 20,
      used_meeting_requests: 0,
      max_boost_amount: 500.00,
      used_boost_amount: 0.00
    };

    const { data, error } = await supabase
      .from('passes')
      .insert([passData])
      .select();

    if (error) {
      console.error('Error creating pass:', error);
      return;
    }

    console.log('✅ Pass created successfully:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestUserPass();
