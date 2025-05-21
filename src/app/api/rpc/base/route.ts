import { NextRequest, NextResponse } from 'next/server';

// Whitelisted RPC endpoints we're willing to proxy
const ALLOWED_RPC_ENDPOINTS = [
  'https://mainnet.base.org',
  'https://base-mainnet-rpc.publicnode.com'
];

// Default endpoint to use if none specified
const DEFAULT_RPC_ENDPOINT = 'https://mainnet.base.org';

/**
 * API Route for proxying RPC requests to avoid CORS errors
 */
export async function POST(request: NextRequest) {
  try {
    // Read the request body
    const body = await request.json();
    
    // Get the target RPC URL from the query params or use default
    const targetUrl = request.nextUrl.searchParams.get('url') || DEFAULT_RPC_ENDPOINT;
    
    // Validate the target URL is in our whitelist for security
    if (!ALLOWED_RPC_ENDPOINTS.includes(targetUrl)) {
      return NextResponse.json(
        { error: 'Invalid RPC endpoint' },
        { status: 400 }
      );
    }
    
    // Forward the request to the actual RPC endpoint
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Set a reasonable timeout
      signal: AbortSignal.timeout(8000),
    });
    
    // Get the response data
    const data = await response.json();
    
    // Return the proxied response
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('RPC proxy error:', error);
    
    // Return a proper JSON-RPC error response
    return NextResponse.json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: 'Internal JSON-RPC error',
        data: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    }, { status: 500 });
  }
} 