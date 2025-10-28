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
 * Generates avatar URL for a speaker
 * @param name - The speaker's name
 * @param baseUrl - The base URL for images (optional)
 * @returns Complete avatar URL
 */
export function getSpeakerAvatarUrl(name: string, baseUrl: string = 'https://blockchainsummit.la/wp-content/uploads/2025/09'): string {
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
