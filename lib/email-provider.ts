import { Platform, Linking } from 'react-native';

/**
 * Detects the email provider from an email address and returns the URL to open it
 */

export interface EmailProvider {
  name: string;
  url: string;
  deepLink?: string; // Mobile deep link
  icon?: string;
}

export function getEmailProviderUrl(email: string): EmailProvider | null {
  if (!email || !email.includes('@')) {
    return null;
  }

  const domain = email.split('@')[1]?.toLowerCase() || '';
  
  // Gmail
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return {
      name: 'Gmail',
      url: 'https://mail.google.com',
      deepLink: 'googlegmail://', // Gmail app deep link
      icon: 'gmail',
    };
  }

  // Outlook / Hotmail / Live / MSN
  if (
    domain === 'outlook.com' ||
    domain === 'hotmail.com' ||
    domain === 'live.com' ||
    domain === 'msn.com' ||
    domain === 'outlook.fr' ||
    domain === 'outlook.de' ||
    domain === 'outlook.es' ||
    domain === 'outlook.it' ||
    domain === 'outlook.co.uk'
  ) {
    return {
      name: 'Outlook',
      url: 'https://outlook.live.com',
      deepLink: 'ms-outlook://', // Outlook app deep link
      icon: 'outlook',
    };
  }

  // Yahoo
  if (
    domain === 'yahoo.com' ||
    domain === 'yahoo.co.uk' ||
    domain === 'yahoo.fr' ||
    domain === 'yahoo.de' ||
    domain === 'yahoo.es' ||
    domain === 'yahoo.it' ||
    domain === 'ymail.com' ||
    domain === 'rocketmail.com'
  ) {
    return {
      name: 'Yahoo Mail',
      url: 'https://mail.yahoo.com',
      deepLink: 'ymail://', // Yahoo Mail app deep link
      icon: 'yahoo',
    };
  }

  // Apple iCloud
  if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
    return {
      name: 'iCloud Mail',
      url: 'https://www.icloud.com/mail',
      deepLink: 'message://', // iOS Mail app (fallback to mailto)
      icon: 'apple',
    };
  }

  // ProtonMail
  if (domain === 'protonmail.com' || domain === 'proton.me' || domain === 'pm.me') {
    return {
      name: 'ProtonMail',
      url: 'https://mail.proton.me',
      icon: 'protonmail',
    };
  }

  // AOL
  if (domain === 'aol.com' || domain === 'aol.co.uk') {
    return {
      name: 'AOL Mail',
      url: 'https://mail.aol.com',
      icon: 'aol',
    };
  }

  // Zoho
  if (domain.includes('zoho.com') || domain.includes('zohomail.com')) {
    return {
      name: 'Zoho Mail',
      url: 'https://mail.zoho.com',
      icon: 'zoho',
    };
  }

  // FastMail
  if (domain === 'fastmail.com' || domain.includes('fastmail.fm')) {
    return {
      name: 'FastMail',
      url: 'https://www.fastmail.com',
      icon: 'fastmail',
    };
  }

  // Mail.com
  if (domain.includes('mail.com')) {
    return {
      name: 'Mail.com',
      url: 'https://www.mail.com',
      icon: 'mail',
    };
  }

  // Generic - try to open mailto or return null
  return null;
}

/**
 * Opens the email provider in a new window/tab (web) or app (mobile)
 */
export async function openEmailProvider(email: string): Promise<void> {
  const provider = getEmailProviderUrl(email);
  
  if (!provider) {
    // Fallback to mailto: if no provider detected
    if (Platform.OS !== 'web') {
      try {
        await Linking.openURL(`mailto:${email}`);
      } catch (error) {
        console.error('Error opening mailto:', error);
      }
    }
    return;
  }

  if (Platform.OS === 'web') {
    // Web: open in new tab
    if (typeof window !== 'undefined') {
      window.open(provider.url, '_blank', 'noopener,noreferrer');
    }
  } else {
    // Mobile: try deep link first, then fallback to mailto
    try {
      if (provider.deepLink) {
        // Try to open the specific email app
        const canOpen = await Linking.canOpenURL(provider.deepLink);
        if (canOpen) {
          await Linking.openURL(provider.deepLink);
          return;
        }
      }
      // Fallback to mailto: which opens default email app
      await Linking.openURL(`mailto:${email}`);
    } catch (error) {
      console.error('Error opening email provider:', error);
      // Final fallback to mailto
      try {
        await Linking.openURL(`mailto:${email}`);
      } catch (fallbackError) {
        console.error('Error opening mailto fallback:', fallbackError);
      }
    }
  }
}

