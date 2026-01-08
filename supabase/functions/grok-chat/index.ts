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
    fetch('http://127.0.0.1:7243/ingest/811a88ed-ce7c-4965-bb66-ff046273fa15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'grok-chat/index.ts:13',message:'Edge function entry - checking API key',data:{hasKey:!!XAI_API_KEY,keyPrefix:XAI_API_KEY?XAI_API_KEY.substring(0,8)+'***':'none'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
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
    fetch('http://127.0.0.1:7243/ingest/811a88ed-ce7c-4965-bb66-ff046273fa15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'grok-chat/index.ts:35',message:'Request body parsed',data:{model:body.model,messageCount:body.messages?.length,hasTemp:!!body.temperature,hasMaxTokens:!!body.max_tokens},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,E'})}).catch(()=>{});
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

    console.log('Proxying request to Grok API:', {
      model: body.model,
      messageCount: body.messages?.length
    })

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/811a88ed-ce7c-4965-bb66-ff046273fa15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'grok-chat/index.ts:52',message:'About to call Grok API',data:{url:'https://api.x.ai/v1/chat/completions',model:body.model,authPrefix:XAI_API_KEY.substring(0,8)+'***'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D'})}).catch(()=>{});
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
    fetch('http://127.0.0.1:7243/ingest/811a88ed-ce7c-4965-bb66-ff046273fa15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'grok-chat/index.ts:67',message:'Grok API response received',data:{status:grokResponse.status,ok:grokResponse.ok,statusText:grokResponse.statusText},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C,D,E'})}).catch(()=>{});
    // #endregion

    if (!grokResponse.ok) {
      const errorText = await grokResponse.text()
      console.error('Grok API error:', grokResponse.status, errorText)
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/811a88ed-ce7c-4965-bb66-ff046273fa15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'grok-chat/index.ts:76',message:'Grok API error details',data:{status:grokResponse.status,errorText:errorText,requestedModel:body.model},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
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
    fetch('http://127.0.0.1:7243/ingest/811a88ed-ce7c-4965-bb66-ff046273fa15',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'grok-chat/index.ts:93',message:'Successful response from Grok',data:{hasChoices:!!data.choices,choiceCount:data.choices?.length,model:data.model},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
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

