// Minimal Lambda dispatcher for Expo Router API builds
// Routes /api/* to files under ./server/_expo/functions/api/**

// No globals needed

function buildUrl(event) {
  const protocol = (event.headers && (event.headers["x-forwarded-proto"] || event.headers["X-Forwarded-Proto"])) || "https";
  const host = (event.headers && (event.headers.host || event.headers.Host)) || "localhost";
  const path = event.rawPath || event.path || "/";
  const qs = event.rawQueryString || "";
  return `${protocol}://${host}${path}${qs ? `?${qs}` : ''}`;
}

function normalizeApiPath(pathname) {
  // Remove leading /api/
  let p = pathname.replace(/^\/api\/?/, "");
  // Remove trailing slash
  if (p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

async function resolveModule(relativeRoute) {
  // Try exact file: route + '+api.js'
  const basePath = `./server/_expo/functions/api/${relativeRoute}`;
  const exactPath = `${basePath}+api.js`;
  try {
    return await import(exactPath);
  } catch (_) {
    // Try index: route + '/index+api.js'
    try {
      return await import(`${basePath}/index+api.js`);
    } catch (__){
      // Try dynamic last segment: replace last segment with [id]
      const parts = relativeRoute.split('/');
      if (parts.length > 0) {
        parts[parts.length - 1] = '[id]';
        const dynamicPath = `./server/_expo/functions/api/${parts.join('/')}+api.js`;
        try {
          return await import(dynamicPath);
        } catch (___) {
          return null;
        }
      }
      return null;
    }
  }
}

function lambdaEventToRequest(event) {
  const url = buildUrl(event);
  const method = (event.requestContext && event.requestContext.http && event.requestContext.http.method) || event.httpMethod || 'GET';
  const headers = new Headers();
  if (event.headers) {
    for (const [k, v] of Object.entries(event.headers)) {
      if (typeof v === 'string') headers.set(k, v);
    }
  }
  let bodyInit = undefined;
  if (event.body) {
    if (event.isBase64Encoded) {
      bodyInit = Buffer.from(event.body, 'base64');
    } else {
      bodyInit = event.body;
    }
  }
  return new Request(url, { method, headers, body: bodyInit });
}

async function responseToLambda(resp) {
  const headers = {};
  resp.headers.forEach((value, key) => { headers[key] = value; });
  const buffer = Buffer.from(await resp.arrayBuffer());
  const isText = (headers['content-type'] || '').startsWith('text/') || (headers['content-type'] || '').includes('application/json');
  return {
    statusCode: resp.status,
    headers,
    body: isText ? buffer.toString('utf8') : buffer.toString('base64'),
    isBase64Encoded: !isText,
  };
}

export const handler = async (event) => {
  try {
    const pathname = new URL(buildUrl(event)).pathname;
    if (!pathname.startsWith('/api/')) {
      return { statusCode: 404, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Not Found' }) };
    }
    const route = normalizeApiPath(pathname);
    const mod = await resolveModule(route);
    if (!mod) {
      return { statusCode: 404, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'API route not found' }) };
    }

    const method = (event.requestContext && event.requestContext.http && event.requestContext.http.method) || event.httpMethod || 'GET';
    const request = lambdaEventToRequest(event);

    // Prefer exported HTTP verb function (GET, POST, etc.), fallback to handler
    const fn = mod[method] || mod.handler || mod.default;
    if (!fn) {
      return { statusCode: 405, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const result = await fn(request);

    if (result instanceof Response) {
      return await responseToLambda(result);
    }
    // If function returned plain object, serialize as JSON 200
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(result ?? {}) };
  } catch (error) {
    console.error('Lambda dispatcher error:', error);
    return { statusCode: 500, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};


