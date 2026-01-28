/**
 * Locus OAuth Worker
 * Handles GitHub OAuth token exchange
 * Deploy to Cloudflare Workers
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://justinpreston.github.io',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Token exchange endpoint
    if (url.pathname === '/token' && request.method === 'POST') {
      try {
        const { code } = await request.json();
        
        if (!code) {
          return Response.json(
            { error: 'Missing authorization code' },
            { status: 400, headers: corsHeaders }
          );
        }
        
        // Exchange code for token with GitHub
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code: code,
          }),
        });
        
        const tokenData = await tokenResponse.json();
        
        if (tokenData.error) {
          return Response.json(
            { error: tokenData.error, error_description: tokenData.error_description },
            { status: 400, headers: corsHeaders }
          );
        }
        
        return Response.json(
          { access_token: tokenData.access_token, scope: tokenData.scope },
          { headers: corsHeaders }
        );
      } catch (err) {
        return Response.json(
          { error: 'Token exchange failed', details: err.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }
    
    // Health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', service: 'locus-oauth' }, { headers: corsHeaders });
    }
    
    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  },
};
