#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Email configuration
const emailEnabled = process.env.NODEMAILER_HOST && 
                     process.env.NODEMAILER_PORT && 
                     process.env.NODEMAILER_USER && 
                     process.env.NODEMAILER_PASS && 
                     process.env.NODEMAILER_FROM;

if (!emailEnabled) {
  console.error('❌ Email service is not configured');
  process.exit(1);
}

const smtpHost = process.env.NODEMAILER_HOST || '';
const isBrevo = smtpHost.includes('brevo.com') || smtpHost.includes('sendinblue.com');

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: parseInt(process.env.NODEMAILER_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
  tls: {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    servername: isBrevo ? 'smtp-relay.sendinblue.com' : undefined,
    checkServerIdentity: isBrevo ? () => undefined : undefined,
  },
  requireTLS: true,
});

// Test mode - only process specific user
const TEST_MODE = process.argv.includes('--test');
const TEST_USER_EMAIL = 'edward@hashpass.app';
const TEST_SPEAKER_NAMES = ['Edward Calderon']; // Can add more for testing

// Helper function to shuffle array
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get user's pass type
async function getUserPassType(userId) {
  try {
    const { data: passes, error } = await supabase
      .from('passes')
      .select('pass_type')
      .eq('user_id', userId)
      .eq('event_id', 'bsl2025')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !passes) {
      return 'general'; // Default to general
    }

    return passes.pass_type || 'general';
  } catch (error) {
    console.warn(`⚠️  Error getting pass type for user ${userId}:`, error.message);
    return 'general';
  }
}

// Create meeting request
async function createMeetingRequest(requesterId, requesterName, requesterEmail, speakerId, speakerName, passType) {
  try {
    const message = `Hola ${speakerName.split(' ')[0]}, me gustaría coordinar una reunión contigo durante el BSL 2025.`;
    
    const { data, error } = await supabase.rpc('insert_meeting_request', {
      p_requester_id: requesterId,
      p_speaker_id: speakerId,
      p_speaker_name: speakerName,
      p_requester_name: requesterName,
      p_requester_company: null,
      p_requester_title: null,
      p_requester_ticket_type: passType,
      p_meeting_type: 'networking',
      p_message: message,
      p_note: 'Recomendación automática del sistema',
      p_boost_amount: 0,
      p_duration_minutes: 15,
      p_expires_at: null
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data && data.success === false) {
      return { success: false, error: data.message || data.error };
    }

    return { 
      success: true, 
      requestId: data?.request_id || data?.id || 'N/A' 
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Generate email HTML for recommended matches
function generateRecommendationEmail(userName, speakers, locale = 'es') {
  const appUrl = 'https://bsl2025.hashpass.tech';
  
  const emailContent = `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recomendaciones de Speakers - BSL 2025</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f7; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">¡Hola ${userName}!</h1>
              <p style="color: #ffffff; margin: 15px 0 0 0; font-size: 16px; opacity: 0.9;">Hemos preparado recomendaciones especiales para ti</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #1d1d1f; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Basado en tu perfil y preferencias, hemos seleccionado <strong>3 speakers destacados</strong> que creemos que serían excelentes conexiones para ti durante el BSL 2025.
              </p>
              
              <p style="color: #1d1d1f; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Ya hemos enviado solicitudes de reunión a estos speakers en tu nombre. ¡Revisa tu perfil para ver el estado de tus solicitudes!
              </p>
              
              ${speakers.map((speaker, index) => `
              <!-- Speaker Card ${index + 1} -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px; border: 1px solid #e5e5e7; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="80" valign="top" style="padding-right: 20px;">
                          ${speaker.imageurl ? `
                            <img src="${speaker.imageurl}" alt="${speaker.name}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; display: block;">
                          ` : `
                            <div style="width: 80px; height: 80px; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: #ffffff; font-size: 24px; font-weight: 600;">
                              ${speaker.name.charAt(0).toUpperCase()}
                            </div>
                          `}
                        </td>
                        <td valign="top">
                          <h3 style="color: #1d1d1f; margin: 0 0 5px 0; font-size: 20px; font-weight: 600;">${speaker.name}</h3>
                          ${speaker.title ? `<p style="color: #86868b; margin: 0 0 10px 0; font-size: 14px;">${speaker.title}</p>` : ''}
                          ${speaker.company ? `<p style="color: #86868b; margin: 0 0 10px 0; font-size: 14px;">${speaker.company}</p>` : ''}
                          ${speaker.bio ? `<p style="color: #1d1d1f; margin: 10px 0 0 0; font-size: 14px; line-height: 1.5;">${speaker.bio.substring(0, 150)}${speaker.bio.length > 150 ? '...' : ''}</p>` : ''}
                          <a href="${appUrl}/events/bsl2025/speakers/${speaker.id}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background-color: #007AFF; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;">Ver Perfil</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              `).join('')}
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/events/bsl2025/networking" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Ver Todas Mis Solicitudes</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f5f5f7; text-align: center; border-top: 1px solid #e5e5e7;">
              <p style="color: #86868b; font-size: 12px; margin: 0 0 10px 0;">
                Este es un email automático del sistema de matchmaking de BSL 2025.
              </p>
              <p style="color: #86868b; font-size: 12px; margin: 0;">
                <a href="${appUrl}" style="color: #007AFF; text-decoration: none;">HashPass</a> | 
                <a href="https://blockchainsummit.la/" style="color: #007AFF; text-decoration: none;">BSL 2025</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
  
  return emailContent;
}

// Send recommendation email
async function sendRecommendationEmail(email, userName, speakers, locale = 'es') {
  try {
    const subject = '🎯 Recomendaciones de Speakers para ti - BSL 2025';
    const htmlContent = generateRecommendationEmail(userName, speakers, locale);
    
    const mailOptions = {
      from: `HashPass <${process.env.NODEMAILER_FROM}>`,
      to: email,
      subject: subject,
      html: htmlContent,
      text: `Hola ${userName},\n\nHemos seleccionado 3 speakers destacados para ti:\n\n${speakers.map((s, i) => `${i + 1}. ${s.name}${s.title ? ` - ${s.title}` : ''}`).join('\n')}\n\nVisita tu perfil para ver más detalles: https://bsl2025.hashpass.tech/events/bsl2025/networking`,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting user-speaker matching and recommendation campaign...\n');
    
    if (TEST_MODE) {
      console.log('🧪 TEST MODE: Only processing test user\n');
    }
    
    // Get all active speakers (those with user_id linked)
    console.log('📋 Fetching all active speakers...');
    const { data: activeSpeakers, error: speakersError } = await supabase
      .from('bsl_speakers')
      .select('id, name, title, company, bio, imageurl, user_id')
      .not('user_id', 'is', null)
      .order('name');
    
    if (speakersError) {
      console.error('❌ Error fetching speakers:', speakersError);
      process.exit(1);
    }
    
    if (!activeSpeakers || activeSpeakers.length === 0) {
      console.error('❌ No active speakers found');
      process.exit(1);
    }
    
    console.log(`✅ Found ${activeSpeakers.length} active speakers\n`);
    
    // Get all active users (users with active passes)
    console.log('📋 Fetching all active users...');
    let allUsers = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
        page: page,
        perPage: 1000
      });
      
      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        break;
      }
      
      if (usersData && usersData.users && usersData.users.length > 0) {
        allUsers = allUsers.concat(usersData.users);
        hasMore = usersData.users.length === 1000;
        page++;
      } else {
        hasMore = false;
      }
    }
    
    console.log(`✅ Found ${allUsers.length} total users\n`);
    
    // Filter users with active passes
    console.log('📋 Filtering users with active passes...');
    const usersWithActivePasses = [];
    
    for (const user of allUsers) {
      if (!user.email) continue;
      
      // In test mode, only process test user
      if (TEST_MODE && user.email !== TEST_USER_EMAIL) {
        continue;
      }
      
      const { data: passes, error: passesError } = await supabase
        .from('passes')
        .select('id, pass_type, status')
        .eq('user_id', user.id)
        .eq('event_id', 'bsl2025')
        .eq('status', 'active')
        .limit(1);
      
      if (passesError) {
        console.warn(`⚠️  Error checking passes for ${user.email}:`, passesError.message);
        continue;
      }
      
      if (passes && passes.length > 0) {
        usersWithActivePasses.push({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0],
          passType: passes[0].pass_type || 'general'
        });
      }
    }
    
    console.log(`✅ Found ${usersWithActivePasses.length} users with active passes\n`);
    
    if (usersWithActivePasses.length === 0) {
      console.log('⚠️  No users with active passes found');
      return;
    }
    
    // Process each user
    console.log('='.repeat(60));
    console.log('📤 Processing users and creating recommendations...\n');
    console.log('='.repeat(60));
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (const user of usersWithActivePasses) {
      try {
        console.log(`\n👤 Processing: ${user.name} (${user.email})`);
        
        // Get user's speaker user_id if they are a speaker (to exclude themselves)
        const userSpeakerIds = activeSpeakers
          .filter(s => s.user_id === user.id)
          .map(s => s.id);
        
        // Also check by email domain/name to catch edge cases
        const userEmailDomain = user.email.split('@')[0].toLowerCase();
        const userNameLower = user.name.toLowerCase();
        
        // Filter out speakers that are the user themselves
        const availableSpeakers = activeSpeakers.filter(s => {
          // Exclude if user_id matches
          if (userSpeakerIds.includes(s.id)) {
            return false;
          }
          // Exclude if speaker name matches user name (case-insensitive)
          if (s.name.toLowerCase() === userNameLower) {
            return false;
          }
          // Exclude if speaker name contains user email domain (e.g., "edward" in "edward@hashpass.app")
          if (s.name.toLowerCase().includes(userEmailDomain)) {
            return false;
          }
          return true;
        });
        
        if (availableSpeakers.length < 3) {
          console.log(`   ⚠️  Not enough available speakers (${availableSpeakers.length} available, need 3)`);
          errorCount++;
          continue;
        }
        
        // Randomly select 3 speakers
        const shuffled = shuffleArray(availableSpeakers);
        const selectedSpeakers = shuffled.slice(0, 3);
        
        console.log(`   📋 Selected ${selectedSpeakers.length} speakers:`);
        selectedSpeakers.forEach((s, i) => {
          console.log(`      ${i + 1}. ${s.name}`);
        });
        
        // Create meeting requests for each speaker
        const meetingRequests = [];
        for (const speaker of selectedSpeakers) {
          const result = await createMeetingRequest(
            user.id,
            user.name,
            user.email,
            speaker.id,
            speaker.name,
            user.passType
          );
          
          if (result.success) {
            meetingRequests.push({ speaker, requestId: result.requestId });
            console.log(`      ✅ Request created for ${speaker.name}`);
          } else {
            console.log(`      ❌ Failed to create request for ${speaker.name}: ${result.error}`);
          }
          
          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (meetingRequests.length === 0) {
          console.log(`   ⚠️  No meeting requests were created`);
          errorCount++;
          continue;
        }
        
        // Send recommendation email
        const emailResult = await sendRecommendationEmail(
          user.email,
          user.name,
          meetingRequests.map(mr => mr.speaker),
          'es' // Default to Spanish, can be made dynamic
        );
        
        if (emailResult.success) {
          console.log(`   ✅ Recommendation email sent successfully`);
          successCount++;
          results.push({
            user: user.email,
            speakers: meetingRequests.map(mr => mr.speaker.name),
            status: 'success'
          });
        } else {
          console.log(`   ❌ Failed to send email: ${emailResult.error}`);
          errorCount++;
          results.push({
            user: user.email,
            speakers: meetingRequests.map(mr => mr.speaker.name),
            status: 'email_failed',
            error: emailResult.error
          });
        }
        
        // Delay between users
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`   💥 Exception processing ${user.email}:`, error.message);
        errorCount++;
        results.push({
          user: user.email,
          status: 'error',
          error: error.message
        });
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total users processed: ${usersWithActivePasses.length}`);
    console.log(`✅ Successfully processed: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    if (results.length > 0) {
      console.log('\n📋 Detailed Results:');
      results.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.user}`);
        if (result.speakers) {
          console.log(`   Speakers: ${result.speakers.join(', ')}`);
        }
        console.log(`   Status: ${result.status}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      });
    }
    
    console.log('='.repeat(60));
    
    if (TEST_MODE) {
      console.log('\n🧪 TEST MODE COMPLETE');
      console.log('If everything looks good, run without --test flag to process all users');
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

main();

