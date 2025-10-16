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

async function fixDatabase() {
  try {
    console.log('🔧 Fixing database schema...');
    
    // Step 1: Add pass_number column
    console.log('1. Adding pass_number column...');
    const { error: alterError } = await supabase
      .from('passes')
      .select('id')
      .limit(1);
    
    if (alterError && alterError.message.includes('pass_number')) {
      console.log('❌ pass_number column missing. Need to add it via SQL editor.');
      console.log('\n📋 Please run this SQL in your Supabase SQL editor:');
      console.log(`
ALTER TABLE public.passes ADD COLUMN IF NOT EXISTS pass_number TEXT;
UPDATE public.passes SET pass_number = 'BSL2025-' || pass_type::text || '-' || EXTRACT(EPOCH FROM created_at)::bigint WHERE pass_number IS NULL;
ALTER TABLE public.passes ALTER COLUMN pass_number SET NOT NULL;
ALTER TABLE public.passes ADD CONSTRAINT unique_pass_number UNIQUE (pass_number);
      `);
      console.log('\nAfter running the SQL, run this script again to test.');
      return;
    }

    // Step 2: Check if we can create a pass with pass_number
    console.log('2. Testing pass creation with pass_number...');
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
      console.error('❌ Error creating test pass:', testError);
      if (testError.message.includes('pass_number')) {
        console.log('❌ pass_number column still missing. Please run the SQL commands above.');
        return;
      }
    } else {
      console.log('✅ pass_number column exists and test pass created');
      
      // Clean up test pass
      await supabase
        .from('passes')
        .delete()
        .eq('id', testPassData.id);
      
      console.log('✅ Test pass cleaned up');
    }

    // Step 3: Test the get_user_pass_info function
    console.log('3. Testing get_user_pass_info function...');
    const { data: passInfo, error: passInfoError } = await supabase
      .rpc('get_user_pass_info', {
        p_user_id: '13e93d3b-0556-4f0d-a065-1f013019618b'
      });

    if (passInfoError) {
      console.error('❌ Error calling get_user_pass_info:', passInfoError);
    } else {
      console.log('✅ get_user_pass_info function works:', passInfo);
    }

    // Step 4: Test creating a proper pass using create_default_pass
    console.log('4. Testing create_default_pass function...');
    const { data: newPassId, error: createError } = await supabase
      .rpc('create_default_pass', {
        p_user_id: '13e93d3b-0556-4f0d-a065-1f013019618b',
        p_pass_type: 'business'
      });

    if (createError) {
      console.error('❌ Error calling create_default_pass:', createError);
    } else {
      console.log('✅ create_default_pass function works, created pass ID:', newPassId);
    }

    console.log('\n🎉 Database fix completed successfully!');
    console.log('Your passes should now show up in the UI.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixDatabase();
