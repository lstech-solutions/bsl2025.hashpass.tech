// Test script for string-utils functions
function toUrlSafe(str) {
  return str
    .toLowerCase()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

function getSpeakerAvatarUrl(name, baseUrl = 'https://blockchainsummit.la/wp-content/uploads/2025/09') {
  const filename = toUrlSafe(name);
  return `${baseUrl}/foto-${filename}.png`;
}

// Test with accented names
const testNames = [
  'José Manuel Souto',
  'Andrés González', 
  'Sebastián Durán',
  'María Fernanda Marín',
  'César Ferrari',
  'Rocío Alvarez-Ossorio',
  'Diego Fernández',
  'Liz Bejarano',
  'Rafael Teruszkin',
  '0xj4an'
];

console.log('Testing URL-safe conversion:');
testNames.forEach(name => {
  const urlSafe = toUrlSafe(name);
  const avatarUrl = getSpeakerAvatarUrl(name);
  console.log(`${name} -> ${urlSafe} -> ${avatarUrl}`);
});
