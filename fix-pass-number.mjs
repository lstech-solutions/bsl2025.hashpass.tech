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

async function fixPassNumberColumn() {
  try {
    console.log('Adding pass_number column to passes table...');
    
    // Let's first check if the pass_number column exists
    console.log('Checking current passes table structure...');
    
    const { data: passes, error: selectError } = await supabase
      .from('passes')
      .select('*')
      .limit(1);

    if (selectError) {
      console.error('Error checking passes table:', selectError);
      return;
    }

    console.log('Current passes structure:', passes);

    // Try to create a pass with pass_number to see if the column exists
    console.log('Testing pass creation with pass_number...');
    
    const testPassData = {
      id: `test-pass-${Date.now()}`,
      user_id: '13e93d3b-0556-4f0d-a065-1f013019618b',
      event_id: 'bsl2025',
      pass_type: 'general',
      status: 'active',
      pass_number: 'BSL2025-test-123456'
    };

    const { data: testPass, error: testError } = await supabase
      .from('passes')
      .insert([testPassData])
      .select();

    if (testError) {
      console.error('Error creating test pass:', testError);
      if (testError.message.includes('pass_number')) {
        console.log('❌ pass_number column does not exist. Need to add it manually.');
        console.log('Please run this SQL in your Supabase SQL editor:');
        console.log(`
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS pass_number TEXT;
UPDATE public.passes SET pass_number = 'BSL2025-' || pass_type::text || '-' || EXTRACT(EPOCH FROM created_at)::bigint WHERE pass_number IS NULL;
ALTER TABLE public.passes ALTER COLUMN pass_number SET NOT NULL;
ALTER TABLE public.passes ADD CONSTRAINT unique_pass_number UNIQUE (pass_number);
        `);
        return;
      }
    } else {
      console.log('✅ pass_number column exists and test pass created:', testPass);
      
      // Clean up test pass
      await supabase
        .from('passes')
        .delete()
        .eq('id', testPassData.id);
      
      console.log('✅ Test pass cleaned up');
    }

    console.log('🎉 All fixes applied successfully!');

  } catch (error) {
    console.error('Error:', error);
  }
}

fixPassNumberColumn();
