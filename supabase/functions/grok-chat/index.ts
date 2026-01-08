import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get the XAI API key from environment
    const XAI_API_KEY = Deno.env.get('XAI_API_KEY')
    
    if (!XAI_API_KEY) {
      console.error('XAI_API_KEY not set')
      return new Response(
        JSON.stringify({ 
          error: 'XAI API key not configured',
          hint: 'Add XAI_API_KEY secret in Supabase Dashboard > Project Settings > Edge Functions > Secrets'
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse the request body
    const body = await req.json()
    
    // Validate required fields
    if (!body.model || !body.messages) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: model and messages' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Forward the request to Grok API
    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify(body)
    })

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text()
      console.error('Grok API error:', grokResponse.status, errorText)
      return new Response(
        JSON.stringify({ 
          error: 'Grok API request failed',
          status: grokResponse.status,
          details: errorText
        }), 
        { 
          status: grokResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Return the response from Grok
    const data = await grokResponse.json()
    
    return new Response(
      JSON.stringify(data), 
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

