import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// System prompt for generating fan follow-up messages in the vibe check simulation
const VIBE_CHECK_FOLLOWUP_SYSTEM = `You are simulating a flirty, interested fan messaging an OnlyFans creator. Your goal is to generate natural, engaging follow-up messages that help reveal the creator's personality and communication style.

Guidelines:
- Keep messages relatively short (1-3 sentences typically)
- Be flirty but respectful - like a real interested fan
- React naturally to what the creator said
- Show genuine interest in their response
- Use casual texting style (can use emojis sparingly)
- Your messages should feel like natural conversation, not interview questions
- Subtly probe deeper into topics they mention
- Match the energy level they're giving

DO NOT:
- Be creepy or overly sexual
- Ask multiple questions at once
- Sound robotic or scripted
- Use formal language
- Be too long-winded`

// System prompt for analyzing the complete conversation
const VIBE_CHECK_ANALYSIS_SYSTEM = `You are an expert communication analyst specializing in understanding personal communication styles and personality traits through text analysis. You will analyze a conversation between an OnlyFans creator and a simulated fan to extract their idiolect (personal communication style) and personality traits.

Analyze the creator's messages and return a JSON object with this exact structure:
{
  "personalityTraits": {
    "dominantSubmissive": <number from -100 (very submissive) to 100 (very dominant)>,
    "playfulSerious": <number from -100 (very serious) to 100 (very playful)>,
    "confidentShy": <number from -100 (very shy) to 100 (very confident)>,
    "warmthLevel": <number from 0 (cold/distant) to 100 (very warm/friendly)>
  },
  "communicationStyle": {
    "avgResponseLength": "<'brief'|'moderate'|'detailed'>",
    "emojiUsage": "<'none'|'minimal'|'moderate'|'heavy'>",
    "capitalizationStyle": "<'lowercase'|'normal'|'expressive'>",
    "punctuationStyle": "<description of how they use punctuation>",
    "sentenceStructure": "<description of their sentence patterns>"
  },
  "signaturePatterns": {
    "greetings": [<array of greeting phrases they use>],
    "petNames": [<array of pet names/terms of endearment they use>],
    "closings": [<array of closing/goodbye phrases>],
    "fillerWords": [<array of filler words like 'like', 'um', etc>],
    "uniquePhrases": [<array of unique expressions or catchphrases>]
  },
  "flirtationApproach": "<description of how they flirt - teasing, sweet, bold, subtle, etc>",
  "loveLanguageIndicators": [<array of apparent love languages: words of affirmation, quality time, gifts, acts of service, physical touch>],
  "chatterGuidelines": "<Markdown formatted guide for chatters on how to authentically replicate this creator's voice. Include specific examples, dos and don'ts, and key phrases to use.>"
}

Be specific and insightful. The chatterGuidelines should be detailed enough that a chatter could read it and immediately start messaging fans in a way indistinguishable from the creator.`

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
    
    // Check for special vibe check modes
    if (body.mode === 'vibe-check-followup') {
      return handleVibeCheckFollowup(body, XAI_API_KEY)
    }
    
    if (body.mode === 'vibe-check-analyze') {
      return handleVibeCheckAnalyze(body, XAI_API_KEY)
    }
    
    // Default: Original behavior - forward to Grok API
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

/**
 * Handle vibe check follow-up generation
 * Generates a natural fan response based on the conversation so far
 */
async function handleVibeCheckFollowup(body: any, apiKey: string) {
  const { conversation, currentStep, context } = body
  
  if (!conversation || !Array.isArray(conversation)) {
    return new Response(
      JSON.stringify({ error: 'Missing conversation array' }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Build conversation context for Grok
  const messages = [
    { role: 'system', content: VIBE_CHECK_FOLLOWUP_SYSTEM },
    { 
      role: 'user', 
      content: `Here is the conversation so far between a fan and a creator. Generate the next fan message that naturally continues this conversation.

Current conversation step: ${currentStep || 'unknown'}
Context hint: ${context || 'Continue naturally based on their last response'}

Conversation:
${conversation.map((msg: any) => `${msg.role === 'fan' ? 'Fan' : 'Creator'}: ${msg.content}`).join('\n')}

Generate ONLY the fan's next message. No quotes, no "Fan:" prefix, just the message text.`
    }
  ]

  const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages,
      temperature: 0.8,
      max_tokens: 150
    })
  })

  if (!grokResponse.ok) {
    const errorText = await grokResponse.text()
    console.error('Grok API error in followup:', grokResponse.status, errorText)
    return new Response(
      JSON.stringify({ error: 'Failed to generate followup', details: errorText }), 
      { status: grokResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const data = await grokResponse.json()
  const followupMessage = data.choices?.[0]?.message?.content?.trim() || ''

  return new Response(
    JSON.stringify({ message: followupMessage }), 
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/**
 * Handle vibe check conversation analysis
 * Analyzes the complete conversation to extract personality and idiolect
 */
async function handleVibeCheckAnalyze(body: any, apiKey: string) {
  const { conversation } = body
  
  if (!conversation || !Array.isArray(conversation)) {
    return new Response(
      JSON.stringify({ error: 'Missing conversation array' }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Build analysis request for Grok
  const messages = [
    { role: 'system', content: VIBE_CHECK_ANALYSIS_SYSTEM },
    { 
      role: 'user', 
      content: `Analyze this conversation between a simulated fan and an OnlyFans creator. Focus ONLY on the creator's messages to extract their communication style and personality.

Conversation:
${conversation.map((msg: any) => `${msg.role === 'fan' ? 'Fan' : 'Creator'}: ${msg.content}`).join('\n')}

Return ONLY the JSON analysis object, no other text.`
    }
  ]

  const grokResponse = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'grok-3-mini',
      messages,
      temperature: 0.3,
      max_tokens: 2000
    })
  })

  if (!grokResponse.ok) {
    const errorText = await grokResponse.text()
    console.error('Grok API error in analysis:', grokResponse.status, errorText)
    return new Response(
      JSON.stringify({ error: 'Failed to analyze conversation', details: errorText }), 
      { status: grokResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const data = await grokResponse.json()
  const analysisText = data.choices?.[0]?.message?.content?.trim() || ''
  
  // Try to parse the JSON response
  try {
    // Remove any markdown code blocks if present
    const cleanedText = analysisText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    const analysis = JSON.parse(cleanedText)
    
    return new Response(
      JSON.stringify({ analysis }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (parseError) {
    console.error('Failed to parse analysis JSON:', parseError, analysisText)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to parse analysis',
        rawAnalysis: analysisText 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
