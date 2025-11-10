#!/usr/bin/env node
/**
 * Script to fix users who don't have active passes
 * This creates active passes for users who only have cancelled/expired passes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixUsersWithoutActivePasses() {
  console.log('🔍 Finding users without active passes...\n');

  try {
    // Find users who only have cancelled/expired passes
    const { data: users, error: usersError } = await supabase.rpc('execute_sql', {
      query: `
        SELECT 
          u.id,
          u.email,
          COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_passes,
          COUNT(CASE WHEN p.status IN ('cancelled', 'expired', 'used') THEN 1 END) as inactive_passes
        FROM auth.users u
        LEFT JOIN passes p ON p.user_id = u.id::text AND p.event_id = 'bsl2025'
        WHERE u.email IS NOT NULL
        GROUP BY u.id, u.email
        HAVING COUNT(CASE WHEN p.status = 'active' THEN 1 END) = 0
        AND COUNT(CASE WHEN p.status IN ('cancelled', 'expired', 'used') THEN 1 END) > 0
        ORDER BY u.created_at DESC
      `
    });

    if (usersError) {
      // Try alternative query using direct Supabase query
      const { data: allUsers, error: allUsersError } = await supabase.auth.admin.listUsers();
      
      if (allUsersError) {
        console.error('❌ Error fetching users:', allUsersError);
        return;
      }

      const usersToFix = [];
      
      for (const user of allUsers.users) {
        const { data: passes, error: passesError } = await supabase
          .from('passes')
          .select('status')
          .eq('user_id', user.id)
          .eq('event_id', 'bsl2025');

        if (passesError) {
          console.error(`❌ Error fetching passes for ${user.email}:`, passesError);
          continue;
        }

        const activePasses = passes.filter(p => p.status === 'active');
        const inactivePasses = passes.filter(p => ['cancelled', 'expired', 'used'].includes(p.status));

        if (activePasses.length === 0 && inactivePasses.length > 0) {
          usersToFix.push({
            id: user.id,
            email: user.email,
            inactive_passes: inactivePasses.length
          });
        }
      }

      if (usersToFix.length === 0) {
        console.log('✅ No users found without active passes.');
        return;
      }

      console.log(`📋 Found ${usersToFix.length} users without active passes:\n`);
      
      for (const user of usersToFix) {
        console.log(`   - ${user.email} (${user.inactive_passes} inactive pass(es))`);
      }

      console.log('\n🔧 Creating active passes for these users...\n');

      let successCount = 0;
      let errorCount = 0;

      for (const user of usersToFix) {
        try {
          const { data, error } = await supabase.rpc('create_default_pass', {
            p_user_id: user.id,
            p_pass_type: 'general'
          });

          if (error) {
            console.error(`❌ Error creating pass for ${user.email}:`, error.message);
            errorCount++;
          } else {
            console.log(`✅ Created active pass for ${user.email}`);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exception creating pass for ${user.email}:`, err.message);
          errorCount++;
        }
      }

      console.log(`\n✅ Summary:`);
      console.log(`   Success: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`   Total: ${usersToFix.length}`);
    } else {
      console.log(`📋 Found ${users.length} users without active passes\n`);
      
      if (users.length === 0) {
        console.log('✅ All users have active passes.');
        return;
      }

      console.log('🔧 Creating active passes for these users...\n');

      let successCount = 0;
      let errorCount = 0;

      for (const user of users) {
        try {
          const { data, error } = await supabase.rpc('create_default_pass', {
            p_user_id: user.id,
            p_pass_type: 'general'
          });

          if (error) {
            console.error(`❌ Error creating pass for ${user.email}:`, error.message);
            errorCount++;
          } else {
            console.log(`✅ Created active pass for ${user.email}`);
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Exception creating pass for ${user.email}:`, err.message);
          errorCount++;
        }
      }

      console.log(`\n✅ Summary:`);
      console.log(`   Success: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);
      console.log(`   Total: ${users.length}`);
    }
  } catch (error) {
    console.error('❌ Error in fixUsersWithoutActivePasses:', error);
  }
}

// Run the script
fixUsersWithoutActivePasses()
  .then(() => {
    console.log('\n✅ Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

