import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Read versions.json from config directory
    // Try multiple paths to ensure we always get the latest version
    const possiblePaths = [
      join(process.cwd(), 'config', 'versions.json'),
      join(process.cwd(), 'dist', 'client', 'config', 'versions.json'),
      join(process.cwd(), 'dist', 'config', 'versions.json'),
    ];
    
    let versionsData = null;
    let versionsPath = null;
    
    for (const path of possiblePaths) {
      try {
        versionsData = readFileSync(path, 'utf-8');
        versionsPath = path;
        break;
      } catch (e) {
        // Try next path
        continue;
      }
    }
    
    if (!versionsData) {
      throw new Error('versions.json not found in any expected location');
    }
    
    const versions = JSON.parse(versionsData);
    
    // Log for debugging
    console.log(`[API] Serving versions.json from: ${versionsPath}`);
    console.log(`[API] Current version: ${versions.currentVersion}`);

    return new Response(JSON.stringify(versions), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Version-Source': versionsPath || 'unknown',
        'X-Current-Version': versions.currentVersion || 'unknown',
        'X-Timestamp': Date.now().toString(),
      },
    });
  } catch (error: any) {
    console.error('Error reading versions.json:', error);
    // Try to read package.json as fallback
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const fallbackVersion = packageJson.version || '1.6.22';
      
      console.log(`[API] Using fallback version from package.json: ${fallbackVersion}`);
      
      return new Response(
        JSON.stringify({
          currentVersion: fallbackVersion,
          versions: [],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Version-Source': 'package.json-fallback',
          },
        }
      );
    } catch (fallbackError) {
      // Last resort: return hardcoded version
      return new Response(
        JSON.stringify({
          currentVersion: '1.6.22',
          versions: [],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'X-Version-Source': 'hardcoded-fallback',
          },
        }
      );
    }
  }
}


