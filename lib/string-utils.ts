/**
 * Utility functions for string manipulation
 */

import Constants from 'expo-constants';

/**
 * Converts accented characters to ASCII equivalents for URL-safe strings
 * @param str - The string to convert
 * @returns ASCII-safe string
 */
export function toUrlSafe(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Converts a speaker name to a URL-safe filename for avatars
 * @param name - The speaker's name
 * @returns URL-safe filename
 */
export function speakerNameToFilename(name: string): string {
  return toUrlSafe(name);
}

/**
 * Generates avatar URL for a speaker from S3
 * Note: The database imageurl should contain the S3 URL if available.
 * This function is used as a fallback when imageurl is not set.
 * @param name - The speaker's name
 * @param s3Url - S3 URL if already known (optional)
 * @returns Complete avatar URL (always S3)
 */
export function getSpeakerAvatarUrl(
  name: string, 
  s3Url?: string
): string {
  // If S3 URL is provided, use it as primary
  if (s3Url) {
    return s3Url;
  }

  // Default S3 bucket configuration (hashpass-assets)
  const defaultS3Bucket = 'hashpass-assets';
  const defaultAwsRegion = 'us-east-2';

  // Try to get S3 URL from environment/config
  // Works on both server-side and client-side (with EXPO_PUBLIC_ prefix)
  let s3Bucket = '';
  let cdnUrl = '';
  let awsRegion = defaultAwsRegion;

  // Check environment variables (server-side or build-time)
  // Also check for AWS_S3_BUCKET (not just AWS_S3_BUCKET_NAME)
  if (typeof process !== 'undefined' && process.env) {
    s3Bucket = process.env.AWS_S3_BUCKET || 
               process.env.AWS_S3_BUCKET_NAME || 
               process.env.EXPO_PUBLIC_AWS_S3_BUCKET || 
               process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME || 
               '';
    cdnUrl = process.env.AWS_S3_CDN_URL || 
             process.env.AWS_S3_BUCKET_URL || 
             process.env.EXPO_PUBLIC_AWS_S3_CDN_URL || 
             process.env.EXPO_PUBLIC_AWS_S3_BUCKET_URL || 
             '';
    awsRegion = process.env.AWS_REGION || 
                process.env.EXPO_PUBLIC_AWS_REGION || 
                defaultAwsRegion;
  }

  // Check Expo Constants (client-side runtime)
  // This allows accessing env vars in React Native/Expo client-side code
  if (Constants?.expoConfig?.extra) {
    const extra = Constants.expoConfig.extra as any;
    if (!s3Bucket) {
      s3Bucket = extra.AWS_S3_BUCKET || 
                 extra.AWS_S3_BUCKET_NAME || 
                 extra.EXPO_PUBLIC_AWS_S3_BUCKET || 
                 extra.EXPO_PUBLIC_AWS_S3_BUCKET_NAME || 
                 '';
    }
    if (!cdnUrl) {
      cdnUrl = extra.AWS_S3_CDN_URL || 
               extra.AWS_S3_BUCKET_URL || 
               extra.EXPO_PUBLIC_AWS_S3_CDN_URL || 
               extra.EXPO_PUBLIC_AWS_S3_BUCKET_URL || 
               '';
    }
    if (awsRegion === defaultAwsRegion) {
      awsRegion = extra.AWS_REGION || 
                  extra.EXPO_PUBLIC_AWS_REGION || 
                  defaultAwsRegion;
    }
  }

  // Use default bucket if not in env (we know it's hashpass-assets)
  if (!s3Bucket) {
    s3Bucket = defaultS3Bucket;
  }

  // Generate S3 URL
  const filename = speakerNameToFilename(name);
  const s3Key = `speakers/avatars/foto-${filename}.png`;
  
  // Use CDN URL if available, otherwise use S3 bucket URL
  if (cdnUrl && !cdnUrl.startsWith('s3://') && !cdnUrl.startsWith('arn:')) {
    return `${cdnUrl}/${s3Key}`.replace(/\/+/g, '/').replace(':/', '://');
  } else if (s3Bucket) {
    return `https://${s3Bucket}.s3.${awsRegion}.amazonaws.com/${s3Key}`;
  }

  // Always return S3 URL - never fallback to blockchainsummit.la
  // If S3 bucket is not configured, still return S3 URL format (will fail gracefully)
  return `https://${s3Bucket}.s3.${awsRegion}.amazonaws.com/${s3Key}`;
}

/**
 * Generates LinkedIn URL for a speaker
 * @param name - The speaker's name
 * @returns LinkedIn URL
 */
export function getSpeakerLinkedInUrl(name: string): string {
  const username = speakerNameToFilename(name);
  return `https://linkedin.com/in/${username}`;
}

/**
 * Generates Twitter URL for a speaker
 * @param name - The speaker's name
 * @returns Twitter URL
 */
export function getSpeakerTwitterUrl(name: string): string {
  const username = speakerNameToFilename(name);
  return `https://twitter.com/${username}`;
}
