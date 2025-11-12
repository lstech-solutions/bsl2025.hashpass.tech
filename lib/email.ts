import nodemailer from 'nodemailer';
import emails from '../i18n/locales/emails.json';
import { getEmailAssetUrl } from './s3-service';
import { supabaseServer } from './supabase-server';

// Default to English if locale is not provided or not supported
const DEFAULT_LOCALE = 'en';

// Supported locales
const SUPPORTED_LOCALES = ['en', 'es', 'ko', 'fr', 'pt', 'de'];

// Email types
export type EmailType = 'welcome' | 'userOnboarding' | 'speakerOnboarding';

// Helper function to detect user locale from user metadata or default to 'en'
export async function detectUserLocale(userId?: string, userMetadata?: any): Promise<string> {
  // Try to get locale from user metadata
  if (userMetadata?.locale && SUPPORTED_LOCALES.includes(userMetadata.locale)) {
    return userMetadata.locale;
  }
  
  // Try to get locale from user preferences if userId is provided
  if (userId) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Check if there's a user_preferences table or similar
      // For now, we'll use metadata
    } catch (error) {
      // Ignore errors and fall back to default
    }
  }
  
  // Default to English
  return DEFAULT_LOCALE;
}

// Type definitions for our email translations
interface EmailTranslations {
  [key: string]: {
    [locale: string]: {
      subject: string;
      html: {
        [key: string]: string;
      };
    };
  };
}

// Validate required environment variables
const requiredEnvVars = [
  'NODEMAILER_HOST',
  'NODEMAILER_PORT',
  'NODEMAILER_USER',
  'NODEMAILER_PASS',
  'NODEMAILER_FROM'
];

// Check if all required environment variables are set
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.warn(`Warning: Missing required email configuration: ${missingVars.join(', ')}`);
  console.warn('Email functionality will be disabled');
}

const emailEnabled = missingVars.length === 0;

const smtpHost = process.env.NODEMAILER_HOST || '';
const isBrevo = smtpHost.includes('brevo.com') || smtpHost.includes('sendinblue.com');

const transporter = emailEnabled ? nodemailer.createTransport({
  host: smtpHost,
  port: parseInt(process.env.NODEMAILER_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
  // Add connection timeout
  connectionTimeout: 10000, // 10 seconds
  // Add TLS options
  tls: {
    // Do not fail on invalid certs
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    // For Brevo/Sendinblue, allow hostname mismatch but still verify certificate
    servername: isBrevo ? 'smtp-relay.sendinblue.com' : undefined,
    checkServerIdentity: isBrevo ? () => undefined : undefined,
  },
  requireTLS: true,
}) : null;

function getEmailContent(type: 'subscriptionConfirmation' | 'welcome' | 'userOnboarding' | 'speakerOnboarding', locale: string = DEFAULT_LOCALE) {
  // Fallback to English if the requested locale is not available
  const translations = (emails as EmailTranslations)[type];
  if (!translations) {
    throw new Error(`Email type ${type} not found in translations`);
  }
  const lang = translations[locale] ? locale : DEFAULT_LOCALE;
  return translations[lang];
}

// Helper function to convert camelCase to UPPER_SNAKE_CASE
function camelToUpperSnake(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1') // Insert underscore before capital letters
    .toUpperCase() // Convert to uppercase
    .replace(/^_/, ''); // Remove leading underscore if any
}

// Helper function to replace placeholders in template with translated content
function replaceTemplatePlaceholders(template: string, translations: any, assets: Record<string, string>, locale: string = 'en'): string {
  let content = template;
  const replacedPlaceholders: string[] = [];
  const missingPlaceholders: string[] = [];
  
  // First, replace all translation placeholders
  Object.keys(translations.html).forEach((key) => {
    const value = translations.html[key];
    
    // Skip if value is null, undefined, or empty
    if (value == null || value === '') {
      missingPlaceholders.push(key);
      return;
    }
    
    // Convert camelCase key to UPPER_SNAKE_CASE placeholder
    const placeholder = `[${camelToUpperSnake(key)}]`;
    let processedValue = String(value);
    
    // Replace variables within the translation value (use global replace)
    if (processedValue.includes('{appUrl}')) {
      processedValue = processedValue.replace(/{appUrl}/g, `<a href="${assets.appUrl || 'https://bsl2025.hashpass.tech'}" style="color: #007AFF; text-decoration: underline;">${assets.appUrl || 'bsl2025.hashpass.tech'}</a>`);
    }
    if (processedValue.includes('{hashpassUrl}')) {
      processedValue = processedValue.replace(/{hashpassUrl}/g, '<a href="https://hashpass.tech" style="color: #007AFF; text-decoration: none;">hashpass.tech</a>');
    }
    if (processedValue.includes('{bslUrl}')) {
      processedValue = processedValue.replace(/{bslUrl}/g, '<a href="https://blockchainsummit.la/" style="color: #007AFF; text-decoration: none;">BSL 2025</a>');
    }
    if (processedValue.includes('{supportEmail}')) {
      const supportEmail = process.env.NODEMAILER_FROM_SUPPORT || 'support@hashpass.tech';
      processedValue = processedValue.replace(/{supportEmail}/g, `<a href="mailto:${supportEmail}" style="color: #007AFF; text-decoration: underline;">${supportEmail}</a>`);
    }
    
    // Escape special regex characters in placeholder and replace
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedPlaceholder, 'g');
    const matches = content.match(regex);
    if (matches && matches.length > 0) {
      content = content.replace(regex, processedValue);
      replacedPlaceholders.push(placeholder);
    }
  });
  
  // Then, replace asset placeholders (these should be in camelCase in assets object)
  Object.keys(assets).forEach((key) => {
    const placeholder = `[${camelToUpperSnake(key)}]`;
    const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const assetValue = assets[key];
    if (assetValue) {
      const regex = new RegExp(escapedPlaceholder, 'g');
      const matches = content.match(regex);
      if (matches && matches.length > 0) {
        content = content.replace(regex, assetValue);
        replacedPlaceholders.push(placeholder);
      }
    }
  });
  
  // Replace lang placeholder
  content = content.replace(/\[LANG\]/g, locale);
  
  // Debug logging (only in development)
  if (process.env.NODE_ENV !== 'production') {
    if (missingPlaceholders.length > 0) {
      console.warn('⚠️ Missing translation values for keys:', missingPlaceholders);
    }
    const remainingPlaceholders = content.match(/\[([A-Z_]+)\]/g);
    if (remainingPlaceholders) {
      const uniqueRemaining = [...new Set(remainingPlaceholders)];
      console.warn('⚠️ Placeholders not replaced:', uniqueRemaining.slice(0, 10));
    }
  }
  
  return content;
}

/**
 * Email Tracking Functions
 */

/**
 * Check if an email has been sent to a user
 */
export async function hasEmailBeenSent(
  userId: string,
  emailType: EmailType
): Promise<boolean> {
  try {
    const { data, error } = await supabaseServer.rpc('has_email_been_sent', {
      p_user_id: userId,
      p_email_type: emailType
    } as any);
    
    if (error) {
      console.error('Error checking email tracking:', error);
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.error('Error checking email tracking:', error);
    return false;
  }
}

/**
 * Mark an email as sent for a user
 */
export async function markEmailAsSent(
  userId: string,
  emailType: EmailType,
  locale: string = DEFAULT_LOCALE,
  messageId?: string
): Promise<{ success: boolean; error?: string; trackingId?: string }> {
  try {
    // Build parameters object - only include message_id if it's provided
    const params: any = {
      p_user_id: userId,
      p_email_type: emailType,
      p_locale: locale
    };
    
    // Only add message_id if it's provided (not null/undefined)
    if (messageId) {
      params.p_message_id = messageId;
    }
    
    const { data, error } = await supabaseServer.rpc('mark_email_as_sent', params);
    
    if (error) {
      console.error('Error marking email as sent:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, trackingId: data };
  } catch (error: any) {
    console.error('Error marking email as sent:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}

/**
 * Get all emails sent to a user
 */
export async function getUserEmailTracking(
  userId: string
): Promise<Array<{ emailType: EmailType; sentAt: string; locale: string }>> {
  try {
    const { data, error } = await supabaseServer.rpc('get_user_email_tracking', {
      p_user_id: userId
    } as any);
    
    if (error) {
      console.error('Error getting user email tracking:', error);
      return [];
    }
    
    return ((data || []) as any[]).map((item: any) => ({
      emailType: item.email_type as EmailType,
      sentAt: item.sent_at,
      locale: item.locale
    }));
  } catch (error) {
    console.error('Error getting user email tracking:', error);
    return [];
  }
}

/**
 * Get user ID from email address
 */
async function getUserIdFromEmail(email: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseServer.auth.admin.listUsers();
    
    if (error) {
      console.error('Error getting user from email:', error);
      return null;
    }
    
    const user = data?.users?.find(u => u.email === email);
    return user?.id || null;
  } catch (error) {
    console.error('Error getting user from email:', error);
    return null;
  }
}

/**
 * Send welcome email to a newly registered user
 * This function should be called when a new user is registered
 */
export async function sendWelcomeEmailToNewUser(
  userId: string,
  email: string,
  locale?: string
): Promise<{ success: boolean; error?: string; messageId?: string; alreadySent?: boolean }> {
  try {
    // Detect locale if not provided
    let userLocale = locale;
    if (!userLocale) {
      userLocale = await detectUserLocale(userId);
    }
    
    // Send welcome email (it will check if already sent internally)
    const result = await sendWelcomeEmail(email, userLocale, userId);
    
    if (result.success && !result.alreadySent) {
      console.log(`✅ Welcome email sent to new user ${userId} (${email})`);
    } else if (result.alreadySent) {
      console.log(`ℹ️ Welcome email already sent to user ${userId} (${email})`);
    }
    
    return result;
  } catch (error: any) {
    console.error('Error sending welcome email to new user:', error);
    return {
      success: false,
      error: error?.message || 'Failed to send welcome email'
    };
  }
}

export async function sendSubscriptionConfirmation(
  email: string,
  locale: string = DEFAULT_LOCALE
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!emailEnabled) {
    console.warn('Email functionality is disabled due to missing configuration');
    return { 
      success: false, 
      error: 'Email service is not configured' 
    };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { 
      success: false, 
      error: 'Invalid email address' 
    };
  }

  try {
    const content = getEmailContent('subscriptionConfirmation', locale);
    const year = new Date().getFullYear();
    
    const mailOptions = {
      from: `HashPass <${process.env.NODEMAILER_FROM}>`,
      to: email,
      subject: content.subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">${content.html.header}</h2>
          <p>${content.html.greeting}</p>
          <p>${content.html.body}</p>
          <p>${content.html.footer}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="font-size: 12px; color: #6b7280;">
            ${content.html.copyright.replace('{year}', year.toString())}<br>
            <a href="${content.html.website}" style="color: #4f46e5; text-decoration: none;">${content.html.website.replace('https://', '')}</a>
          </p>
        </div>
      `,
      text: `${content.html.header}

${content.html.greeting}

${content.html.body}

${content.html.footer}

---
${content.html.copyright.replace('{year}', year.toString())}
${content.html.website}`,
    };

    if (!transporter) {
      throw new Error('Email transporter is not initialized');
    }

    // Verify connection configuration
    try {
      await transporter.verify();
    } catch (error) {
      console.error('Email server connection error:', error);
      throw new Error('Could not connect to email server. Please try again later.');
    }

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    // Log success but don't expose internal details to client
    console.log('Email sent:', info.messageId);
    return { 
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    
    // Return user-friendly error messages based on error type
    let errorMessage = 'Failed to send confirmation email';
    
    if (error instanceof Error) {
      if ('code' in error && error.code === 'ECONNECTION') {
        errorMessage = 'Could not connect to email server';
      } else if ('code' in error && error.code === 'EAUTH') {
        errorMessage = 'Email authentication failed';
      } else {
        errorMessage = error.message || errorMessage;
      }
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
}

export async function sendBookingEmail(
  to: string,
  type: 'requested' | 'accepted' | 'cancelled',
  payload: { speakerName?: string; start?: string; location?: string }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!emailEnabled || !transporter) {
    return { success: false, error: 'Email service is not configured' };
  }
  try {
    const subject = type === 'requested' ? 'Nueva solicitud de cita' : type === 'accepted' ? 'Tu cita fue aceptada' : 'Tu cita fue cancelada';
    const html = `
      <p>${subject}</p>
      ${payload.speakerName ? `<p>Con: ${payload.speakerName}</p>` : ''}
      ${payload.start ? `<p>Fecha y hora: ${payload.start}</p>` : ''}
      ${payload.location ? `<p>Ubicación: ${payload.location}</p>` : ''}
    `;
    const info = await transporter.sendMail({ from: `HashPass <${process.env.NODEMAILER_FROM}>`, to, subject, html });
    return { success: true, messageId: info.messageId };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Email failed' };
  }
}

/**
 * Send user onboarding email with tutorial guide
 */
export async function sendUserOnboardingEmail(
  email: string,
  locale: string = DEFAULT_LOCALE,
  userId?: string
): Promise<{ success: boolean; error?: string; messageId?: string; alreadySent?: boolean }> {
  if (!emailEnabled || !transporter) {
    return { success: false, error: 'Email service is not configured' };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { 
      success: false, 
      error: 'Invalid email address' 
    };
  }

  try {
    // Get user ID if not provided
    let user_id: string | undefined = userId;
    if (!user_id) {
      const foundUserId = await getUserIdFromEmail(email);
      user_id = foundUserId || undefined;
    }
    
    // Check if user onboarding email has already been sent
    if (user_id) {
      const alreadySent = await hasEmailBeenSent(user_id, 'userOnboarding');
      if (alreadySent) {
        console.log(`User onboarding email already sent to user ${user_id} (${email})`);
        return { success: true, alreadySent: true };
      }
    }
    
    const fs = require('fs');
    const path = require('path');
    
    // Get translations for the locale
    const translations = getEmailContent('userOnboarding', locale);
    const subject = translations.subject;
    
    let htmlContent: string;
    try {
      // Load unified template
      const templatePath = path.join(process.cwd(), 'emails', 'templates', 'user-onboarding.html');
      htmlContent = fs.readFileSync(templatePath, 'utf-8');
      
      // Helper function to convert image to base64 data URI
      const imageToBase64 = (filePath: string, mimeType: string): string | null => {
        try {
          if (fs.existsSync(filePath)) {
            const imageBuffer = fs.readFileSync(filePath);
            const base64 = imageBuffer.toString('base64');
            return `data:${mimeType};base64,${base64}`;
          }
        } catch (error) {
          console.warn(`Could not load image from ${filePath}:`, error);
        }
        return null;
      };
      
      // Get logo URLs (S3/CDN preferred, fallback to base64)
      let bslLogoUrl: string;
      let hashpassLogoUrl: string;
      
      try {
        bslLogoUrl = getEmailAssetUrl('images/BSL.svg');
        hashpassLogoUrl = getEmailAssetUrl('images/logo-full-hashpass-white.png');
      } catch (error) {
        // Fallback to base64
        const bslLogoPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'BSL.svg');
        const hashpassLogoPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'logo-full-hashpass-white.png');
        
        const bslLogoBase64 = imageToBase64(bslLogoPath, 'image/svg+xml');
        const hashpassLogoBase64 = imageToBase64(hashpassLogoPath, 'image/png');
        
        bslLogoUrl = bslLogoBase64 || getEmailAssetUrl('images/BSL.svg');
        hashpassLogoUrl = hashpassLogoBase64 || getEmailAssetUrl('images/logo-full-hashpass-white.png');
      }
      
      // Get screenshot URLs (S3/CDN preferred)
      let screenshotSignInUrl: string;
      let screenshotExploreGifUrl: string;
      let screenshotRequestMeetingGifUrl: string;
      let screenshotNotificationsUrl: string;
      
      try {
        screenshotSignInUrl = getEmailAssetUrl('images/screenshots/user-onboarding/sign-in-screen.png');
        screenshotExploreGifUrl = getEmailAssetUrl('images/screenshots/user-onboarding/explore-speakers-screen.gif');
        screenshotRequestMeetingGifUrl = getEmailAssetUrl('images/screenshots/user-onboarding/request-meeting-screen.gif');
        screenshotNotificationsUrl = getEmailAssetUrl('images/screenshots/user-onboarding/notifications-screen-1.png');
      } catch (error) {
        // Fallback to base64 if S3 is not available
        const screenshotSignInPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'screenshots', 'user-onboarding', 'sign-in-screen.png');
        const screenshotExploreGifPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'screenshots', 'user-onboarding', 'explore-speakers-screen.gif');
        const screenshotRequestMeetingGifPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'screenshots', 'user-onboarding', 'request-meeting-screen.gif');
        const screenshotNotificationsPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'screenshots', 'user-onboarding', 'notifications-screen-1.png');
        
        screenshotSignInUrl = imageToBase64(screenshotSignInPath, 'image/png') || '';
        screenshotExploreGifUrl = imageToBase64(screenshotExploreGifPath, 'image/gif') || '';
        screenshotRequestMeetingGifUrl = imageToBase64(screenshotRequestMeetingGifPath, 'image/gif') || '';
        screenshotNotificationsUrl = imageToBase64(screenshotNotificationsPath, 'image/png') || '';
      }
      
      // Prepare assets object
      const assets = {
        bslLogoUrl,
        hashpassLogoUrl,
        screenshotSignInUrl,
        screenshotExploreGifUrl,
        screenshotRequestMeetingGifUrl,
        screenshotNotificationsUrl,
        appUrl: 'https://bsl2025.hashpass.tech'
      };
      
      // Replace placeholders with translations and assets
      htmlContent = replaceTemplatePlaceholders(htmlContent, translations, assets, locale);
      
    } catch (error) {
      // Fallback to inline HTML if file doesn't exist
      console.warn('Could not load user onboarding email template file, using fallback');
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #007AFF;">${translations.html.title}</h2>
          <p>${translations.html.introText}</p>
          <p>Please visit the app to see the full tutorial with screenshots.</p>
        </div>
      `;
    }

    const mailOptions = {
      from: `HashPass <${process.env.NODEMAILER_FROM}>`,
      to: email,
      subject: subject,
      html: htmlContent,
      text: `${translations.html.title}\n\n${translations.html.introText}\n\n${translations.html.ctaButton}`,
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Mark email as sent if we have a user ID
    if (user_id) {
      await markEmailAsSent(user_id, 'userOnboarding', locale, info.messageId);
      console.log(`User onboarding email marked as sent for user ${user_id} (${email})`);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending user onboarding email:', error);
    return { 
      success: false, 
      error: error?.message || 'Failed to send onboarding email' 
    };
  }
}

/**
 * Send welcome email to all users
 */
export async function sendWelcomeEmail(
  email: string,
  locale: string = DEFAULT_LOCALE,
  userId?: string
): Promise<{ success: boolean; error?: string; messageId?: string; alreadySent?: boolean }> {
  if (!emailEnabled || !transporter) {
    return { success: false, error: 'Email service is not configured' };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { 
      success: false, 
      error: 'Invalid email address' 
    };
  }

  try {
    // Get user ID if not provided
    let user_id: string | undefined = userId;
    if (!user_id) {
      const foundUserId = await getUserIdFromEmail(email);
      user_id = foundUserId || undefined;
    }
    
    // Check if welcome email has already been sent (with message_id)
    // This check verifies that the email was actually sent (has message_id)
    if (user_id) {
      const alreadySent = await hasEmailBeenSent(user_id, 'welcome');
      if (alreadySent) {
        console.log(`Welcome email already sent to user ${user_id} (${email})`);
        return { success: true, alreadySent: true };
      }
    }
    
    // Additional safety check: verify one more time right before sending
    // This helps prevent race conditions where multiple requests come in simultaneously
    if (user_id) {
      // Small delay to allow any concurrent operations to complete
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Final check before sending
      const finalCheck = await hasEmailBeenSent(user_id, 'welcome');
      if (finalCheck) {
        console.log(`Welcome email already sent to user ${user_id} (${email}) - detected in final check`);
        return { success: true, alreadySent: true };
      }
    }
    
    const fs = require('fs');
    const path = require('path');
    
    // Get translations for the locale
    const translations = getEmailContent('welcome', locale);
    const subject = translations.subject;
    
    let htmlContent: string;
    try {
      // Load unified template
      const templatePath = path.join(process.cwd(), 'emails', 'templates', 'welcome.html');
      htmlContent = fs.readFileSync(templatePath, 'utf-8');
      
      // Helper function to convert image to base64 data URI
      const imageToBase64 = (filePath: string, mimeType: string): string | null => {
        try {
          if (fs.existsSync(filePath)) {
            const imageBuffer = fs.readFileSync(filePath);
            const base64 = imageBuffer.toString('base64');
            return `data:${mimeType};base64,${base64}`;
          }
        } catch (error) {
          console.warn(`Could not load image from ${filePath}:`, error);
        }
        return null;
      };
      
      // Get logo URLs (base64 preferred for email compatibility, S3 as fallback)
      let bslLogoUrl: string;
      let hashpassLogoUrl: string;
      
      // Try base64 first for better email client compatibility
      const bslLogoPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'BSL.svg');
      const hashpassLogoPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'logo-full-hashpass-white.png');
      
      const bslLogoBase64 = imageToBase64(bslLogoPath, 'image/svg+xml');
      const hashpassLogoBase64 = imageToBase64(hashpassLogoPath, 'image/png');
      
      // Use base64 if available, otherwise fallback to S3 URL
      bslLogoUrl = bslLogoBase64 || getEmailAssetUrl('images/BSL.svg');
      hashpassLogoUrl = hashpassLogoBase64 || getEmailAssetUrl('images/logo-full-hashpass-white.png');
      
      // Log which method is being used
      if (bslLogoBase64) {
        console.log('✅ Using base64 for BSL logo (better email compatibility)');
      } else {
        console.log('⚠️ Using S3 URL for BSL logo (fallback):', bslLogoUrl);
      }
      
      // Video URLs - Mux player, thumbnail, GIF preview, and poster (kept for video link)
      // Select video ID based on locale: Spanish uses different video, others use default
      const muxVideoId = locale === 'es' 
        ? 'cHHvJcBJEdt8YnWTbo7cFUxNYOMrwIt02EB7vL02ixmd4'  // Spanish version
        : 'iesctpn00OXTQrYmY02J8JvjNmbNoDDKjzm7qr76lCKEI'; // Default for other languages
      
      // Generate GIF from Mux video (animated preview of first 3 seconds)
      const videoGifUrl = `https://image.mux.com/${muxVideoId}/animated.gif?width=600&fps=15&start=0&end=3`;
      const videoThumbnailUrl = `https://image.mux.com/${muxVideoId}/thumbnail.png?width=600&height=1067&time=11`;
      const videoPosterUrl = `https://image.mux.com/${muxVideoId}/thumbnail.jpg?width=600&height=1067&time=11`;
      
      // Add poster image to Mux player URL
      const videoTitle = locale === 'es' 
        ? 'BSL_2025_Bienvenido_ES'
        : 'BSL_2025_Welcome';
      const videoUrl = `https://player.mux.com/${muxVideoId}?metadata-video-title=${encodeURIComponent(videoTitle)}&video-title=${encodeURIComponent(videoTitle)}&poster=${encodeURIComponent(videoPosterUrl)}`;
      
      // Prepare assets object
      const assets = {
        bslLogoUrl,
        hashpassLogoUrl,
        videoUrl,
        videoThumbnailUrl,
        videoGifUrl, // Use Mux animated GIF generated from the appropriate video based on locale
        videoPosterUrl,
        appUrl: 'https://bsl2025.hashpass.tech'
      };
      
      // Replace placeholders with translations and assets
      htmlContent = replaceTemplatePlaceholders(htmlContent, translations, assets, locale);
      
      // Debug: Check if any placeholders remain (only in development)
      if (process.env.NODE_ENV !== 'production') {
        const remainingPlaceholders = htmlContent.match(/\[([A-Z_]+)\]/g);
        if (remainingPlaceholders && remainingPlaceholders.length > 0) {
          const uniquePlaceholders = [...new Set(remainingPlaceholders)];
          console.warn('⚠️ Unreplaced placeholders found:', uniquePlaceholders.slice(0, 20));
          console.warn('Available translation keys:', Object.keys(translations.html).slice(0, 20));
        } else {
          console.log('✅ All placeholders replaced successfully');
        }
      }
      
    } catch (error) {
      // Fallback to inline HTML if file doesn't exist
      console.warn('Could not load welcome email template file, using fallback');
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">${translations.html.title}</h2>
          <p>${translations.html.subtitle}</p>
        </div>
      `;
    }

    const mailOptions = {
      from: `HashPass <${process.env.NODEMAILER_FROM}>`,
      to: email,
      subject: subject,
      html: htmlContent,
      text: `${translations.html.title}\n\n${translations.html.subtitle}\n\n${translations.html.ctaButton}`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent successfully to ${email}, messageId: ${info.messageId}`);
    
    // Mark email as sent if we have a user ID (this creates the flag in DB with message_id)
    if (user_id) {
      const markResult = await markEmailAsSent(user_id, 'welcome', locale, info.messageId);
      if (markResult.success) {
        console.log(`✅ Welcome email marked as sent in DB for user ${user_id} (${email}) with messageId: ${info.messageId}`);
      } else {
        console.error(`❌ Failed to mark email as sent in DB: ${markResult.error}`);
      }
    } else {
      console.warn(`⚠️ No user ID available, cannot mark email as sent in DB for ${email}`);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    return { 
      success: false, 
      error: error?.message || 'Failed to send welcome email' 
    };
  }
}

/**
 * Send speaker onboarding email with tutorial guide
 */
export async function sendSpeakerOnboardingEmail(
  email: string,
  locale: string = DEFAULT_LOCALE,
  userId?: string
): Promise<{ success: boolean; error?: string; messageId?: string; alreadySent?: boolean }> {
  if (!emailEnabled || !transporter) {
    return { success: false, error: 'Email service is not configured' };
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { 
      success: false, 
      error: 'Invalid email address' 
    };
  }

  try {
    // Get user ID if not provided
    let user_id: string | undefined = userId;
    if (!user_id) {
      const foundUserId = await getUserIdFromEmail(email);
      user_id = foundUserId || undefined;
    }
    
    // Check if speaker onboarding email has already been sent
    if (user_id) {
      const alreadySent = await hasEmailBeenSent(user_id, 'speakerOnboarding');
      if (alreadySent) {
        console.log(`Speaker onboarding email already sent to user ${user_id} (${email})`);
        return { success: true, alreadySent: true };
      }
    }
    
    const fs = require('fs');
    const path = require('path');
    
    // Get translations for the locale
    const translations = getEmailContent('speakerOnboarding', locale);
    const subject = translations.subject;
    
    let htmlContent: string;
    try {
      // Load unified template
      const templatePath = path.join(process.cwd(), 'emails', 'templates', 'speaker-onboarding.html');
      htmlContent = fs.readFileSync(templatePath, 'utf-8');
      
      // Helper function to convert image to base64 data URI
      const imageToBase64 = (filePath: string, mimeType: string): string | null => {
        try {
          if (fs.existsSync(filePath)) {
            const imageBuffer = fs.readFileSync(filePath);
            const base64 = imageBuffer.toString('base64');
            return `data:${mimeType};base64,${base64}`;
          }
        } catch (error) {
          console.warn(`Could not load image from ${filePath}:`, error);
        }
        return null;
      };
      
      // Get logo URLs (S3/CDN preferred, fallback to base64)
      let bslLogoUrl: string;
      let hashpassLogoUrl: string;
      
      try {
        bslLogoUrl = getEmailAssetUrl('images/BSL.svg');
        hashpassLogoUrl = getEmailAssetUrl('images/logo-full-hashpass-white.png');
      } catch (error) {
        // Fallback to base64
        const bslLogoPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'BSL.svg');
        const hashpassLogoPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'logo-full-hashpass-white.png');
        
        const bslLogoBase64 = imageToBase64(bslLogoPath, 'image/svg+xml');
        const hashpassLogoBase64 = imageToBase64(hashpassLogoPath, 'image/png');
        
        bslLogoUrl = bslLogoBase64 || getEmailAssetUrl('images/BSL.svg');
        hashpassLogoUrl = hashpassLogoBase64 || getEmailAssetUrl('images/logo-full-hashpass-white.png');
      }
      
      // Get screenshot URLs (S3/CDN preferred)
      let screenshotSignInUrl: string;
      let screenshotNotificationsGifUrl: string;
      let screenshotAcceptRequestUrl: string;
      let screenshotScheduleViewUrl: string;
      
      try {
        screenshotSignInUrl = getEmailAssetUrl('images/screenshots/speaker-onboarding/sign-in-screen.png');
        screenshotNotificationsGifUrl = getEmailAssetUrl('images/screenshots/speaker-onboarding/notifications-screen.gif');
        screenshotAcceptRequestUrl = getEmailAssetUrl('images/screenshots/speaker-onboarding/accept-request-screen.png');
        screenshotScheduleViewUrl = getEmailAssetUrl('images/screenshots/speaker-onboarding/schedule-view-screen.png');
      } catch (error) {
        // Fallback to base64 if S3 is not available
        const screenshotSignInPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'screenshots', 'speaker-onboarding', 'sign-in-screen.png');
        const screenshotNotificationsGifPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'screenshots', 'speaker-onboarding', 'notifications-screen.gif');
        const screenshotAcceptRequestPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'screenshots', 'speaker-onboarding', 'accept-request-screen.png');
        const screenshotScheduleViewPath = path.join(process.cwd(), 'emails', 'assets', 'images', 'screenshots', 'speaker-onboarding', 'schedule-view-screen.png');
        
        screenshotSignInUrl = imageToBase64(screenshotSignInPath, 'image/png') || '';
        screenshotNotificationsGifUrl = imageToBase64(screenshotNotificationsGifPath, 'image/gif') || '';
        screenshotAcceptRequestUrl = imageToBase64(screenshotAcceptRequestPath, 'image/png') || '';
        screenshotScheduleViewUrl = imageToBase64(screenshotScheduleViewPath, 'image/png') || '';
      }
      
      // Prepare assets object
      const assets = {
        bslLogoUrl,
        hashpassLogoUrl,
        screenshotSignInUrl,
        screenshotNotificationsGifUrl,
        screenshotAcceptRequestUrl,
        screenshotScheduleViewUrl,
        appUrl: 'https://bsl2025.hashpass.tech'
      };
      
      // Replace placeholders with translations and assets
      htmlContent = replaceTemplatePlaceholders(htmlContent, translations, assets, locale);
      
    } catch (error) {
      // Fallback to inline HTML if file doesn't exist
      console.warn('Could not load speaker onboarding email template file, using fallback');
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #FF9500;">${translations.html.title}</h2>
          <p>${translations.html.introText}</p>
          <p>Please visit the app to see the full tutorial with screenshots.</p>
        </div>
      `;
    }

    const mailOptions = {
      from: `HashPass <${process.env.NODEMAILER_FROM}>`,
      to: email,
      subject: subject,
      html: htmlContent,
      text: `${translations.html.title}\n\n${translations.html.introText}\n\n${translations.html.ctaButton}`,
    };

    const info = await transporter.sendMail(mailOptions);
    
    // Mark email as sent if we have a user ID
    if (user_id) {
      await markEmailAsSent(user_id, 'speakerOnboarding', locale, info.messageId);
      console.log(`Speaker onboarding email marked as sent for user ${user_id} (${email})`);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Error sending speaker onboarding email:', error);
    return { 
      success: false, 
      error: error?.message || 'Failed to send onboarding email' 
    };
  }
}
