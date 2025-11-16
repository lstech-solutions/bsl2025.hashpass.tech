/**
 * AWS Lambda Handler for Expo Server API Routes
 * This handler uses Expo Server to handle all API routes
 */

const { createRequestHandler } = require('@expo/server/adapter/node');
const path = require('path');

// Create Expo Server request handler
// The build directory should contain the compiled server code
const handler = createRequestHandler({
  build: path.join(__dirname, 'server'),
});

// AWS Lambda handler for API Gateway
exports.handler = async (event) => {
  try {
    // Extract path and query string from API Gateway event
    const path = event.path || event.requestContext?.path || '/';
    const queryString = event.rawQueryString || event.queryStringParameters 
      ? new URLSearchParams(event.queryStringParameters || {}).toString()
      : '';
    const method = event.httpMethod || event.requestContext?.httpMethod || 'GET';
    
    // Build full URL
    const domainName = event.requestContext?.domainName || 
                      event.headers?.Host || 
                      'api.hashpass.tech';
    const protocol = event.headers?.['X-Forwarded-Proto'] || 'https';
    const fullUrl = `${protocol}://${domainName}${path}${queryString ? `?${queryString}` : ''}`;
    
    // Convert API Gateway event to Request object
    const request = new Request(fullUrl, {
      method: method,
      headers: new Headers(event.headers || {}),
      body: event.body && method !== 'GET' && method !== 'HEAD' 
        ? (typeof event.body === 'string' ? event.body : JSON.stringify(event.body))
        : undefined,
    });

    // Handle the request with Expo Server
    const response = await handler(request);

    // Convert Response to API Gateway format
    const body = await response.text();
    const headers = {};
    response.headers.forEach((value, key) => {
      // API Gateway doesn't support some headers, filter them out
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'content-encoding' && lowerKey !== 'transfer-encoding') {
        headers[key] = value;
      }
    });

    // Ensure CORS headers are present
    if (!headers['Access-Control-Allow-Origin']) {
      headers['Access-Control-Allow-Origin'] = '*';
    }
    if (!headers['Access-Control-Allow-Methods']) {
      headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
    }
    if (!headers['Access-Control-Allow-Headers']) {
      headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    }

    return {
      statusCode: response.status,
      headers,
      body,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.error('Error handling API request:', error);
    console.error('Event:', JSON.stringify(event, null, 2));
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
      isBase64Encoded: false,
    };
  }
};

