import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    // Read versions.json from config directory
    const versionsPath = join(process.cwd(), 'config', 'versions.json');
    const versionsData = readFileSync(versionsPath, 'utf-8');
    const versions = JSON.parse(versionsData);

    return new Response(JSON.stringify(versions), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Error reading versions.json:', error);
    // Return a default version if file doesn't exist
    return new Response(
      JSON.stringify({
        currentVersion: '1.6.19',
        versions: [],
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}


