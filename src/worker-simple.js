export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === '/test') {
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Simple test working',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (url.pathname === '/test-post' && request.method === 'POST') {
      try {
        const body = await request.json();
        return new Response(JSON.stringify({ 
          success: true,
          message: 'POST test working',
          receivedData: body,
          timestamp: new Date().toISOString()
        }), {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Error in POST test',
          details: error.message
        }), {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: 'Not found'
    }), {
      status: 404,
      headers: { 
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
};
