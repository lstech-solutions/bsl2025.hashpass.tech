/**
 * Detects the email provider from an email address and returns the URL to open it
 */

export interface EmailProvider {
  name: string;
  url: string;
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
      icon: 'yahoo',
    };
  }

  // Apple iCloud
  if (domain === 'icloud.com' || domain === 'me.com' || domain === 'mac.com') {
    return {
      name: 'iCloud Mail',
      url: 'https://www.icloud.com/mail',
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
 * Opens the email provider in a new window/tab
 */
export function openEmailProvider(email: string): void {
  const provider = getEmailProviderUrl(email);
  
  if (provider && typeof window !== 'undefined') {
    window.open(provider.url, '_blank', 'noopener,noreferrer');
  }
}

