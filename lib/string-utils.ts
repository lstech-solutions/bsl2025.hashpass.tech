/**
 * Utility functions for string manipulation
 */

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
 * Generates avatar URL for a speaker with S3 fallback
 * Note: The database imageurl should contain the S3 URL if available.
 * This function is used as a fallback when imageurl is not set.
 * @param name - The speaker's name
 * @param baseUrl - The base URL for images (optional, defaults to blockchainsummit.la)
 * @param s3Url - S3 URL if already known (optional)
 * @returns Complete avatar URL
 */
export function getSpeakerAvatarUrl(
  name: string, 
  baseUrl: string = 'https://blockchainsummit.la/wp-content/uploads/2025/09',
  s3Url?: string
): string {
  // If S3 URL is provided, use it as primary
  if (s3Url) {
    return s3Url;
  }

  // Try to get S3 URL from environment/config (server-side only)
  // On client-side, process.env may not be available, so we'll use the baseUrl fallback
  if (typeof process !== 'undefined' && process.env) {
    const s3Bucket = process.env.AWS_S3_BUCKET_NAME || process.env.EXPO_PUBLIC_AWS_S3_BUCKET_NAME || '';
    const cdnUrl = process.env.AWS_S3_CDN_URL || process.env.AWS_S3_BUCKET_URL || process.env.EXPO_PUBLIC_AWS_S3_CDN_URL || '';
    const awsRegion = process.env.AWS_REGION || process.env.EXPO_PUBLIC_AWS_REGION || 'us-east-1';
    
    if (s3Bucket) {
      const filename = speakerNameToFilename(name);
      const s3Key = `speakers/avatars/foto-${filename}.png`;
      
      // Use CDN URL if available, otherwise use S3 bucket URL
      if (cdnUrl && !cdnUrl.startsWith('s3://') && !cdnUrl.startsWith('arn:')) {
        return `${cdnUrl}/${s3Key}`.replace(/\/+/g, '/').replace(':/', '://');
      } else if (s3Bucket) {
        return `https://${s3Bucket}.s3.${awsRegion}.amazonaws.com/${s3Key}`;
      }
    }
  }

  // Fallback to original blockchainsummit.la URL
  // This will be used if S3 is not configured or on client-side
  const filename = speakerNameToFilename(name);
  return `${baseUrl}/foto-${filename}.png`;
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
