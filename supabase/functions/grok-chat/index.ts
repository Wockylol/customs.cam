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
    
    // #region agent log
    console.log('DEBUG [A,B] Edge function entry - checking API key:', {hasKey:!!XAI_API_KEY,keyPrefix:XAI_API_KEY?XAI_API_KEY.substring(0,8)+'***':'none'});
    // #endregion
    
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
    
    // #region agent log
    console.log('DEBUG [C,E] Request body parsed:', {model:body.model,messageCount:body.messages?.length,hasTemp:!!body.temperature,hasMaxTokens:!!body.max_tokens});
    // #endregion
    
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

    // #region agent log
    console.log('DEBUG [C,D] About to call Grok API:', {url:'https://api.x.ai/v1/chat/completions',model:body.model,authPrefix:XAI_API_KEY.substring(0,8)+'***'});
    // #endregion

    // Forward the request to Grok API
    const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`
      },
      body: JSON.stringify(body)
    })

    // #region agent log
    console.log('DEBUG [C,D,E] Grok API response received:', {status:grokResponse.status,ok:grokResponse.ok,statusText:grokResponse.statusText});
    // #endregion

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text()
      console.error('Grok API error:', grokResponse.status, errorText)
      
      // #region agent log
      console.log('DEBUG [C] Grok API error details:', {status:grokResponse.status,errorText:errorText,requestedModel:body.model});
      // #endregion
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
    
    // #region agent log
    console.log('DEBUG [E] Successful response from Grok:', {hasChoices:!!data.choices,choiceCount:data.choices?.length,model:data.model});
    // #endregion
    
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

