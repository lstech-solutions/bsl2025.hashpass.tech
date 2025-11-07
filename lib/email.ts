import nodemailer from 'nodemailer';
import emails from '../i18n/locales/emails.json';

// Default to English if locale is not provided or not supported
const DEFAULT_LOCALE = 'en';

// Type definitions for our email translations
interface EmailTranslations {
  [key: string]: {
    [locale: string]: {
      subject: string;
      html: {
        header: string;
        greeting: string;
        body: string;
        footer: string;
        copyright: string;
        website: string;
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

function getEmailContent(type: 'subscriptionConfirmation', locale: string = DEFAULT_LOCALE) {
  // Fallback to English if the requested locale is not available
  const translations = (emails as EmailTranslations)[type];
  const lang = translations[locale] ? locale : DEFAULT_LOCALE;
  return translations[lang];
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
