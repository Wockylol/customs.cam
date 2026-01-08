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

// Enhanced system prompt for behavior-level idiolect analysis
const VIBE_CHECK_ANALYSIS_SYSTEM = `You are a voice-cloning analyst. Your job is to analyze a creator's messages and produce a simple, actionable guide that chatters can follow to copy this creator's exact texting style.

Focus on OBSERVABLE BEHAVIORS, not personality. Chatters need clear rules they can follow, not descriptions of who someone is.

Analyze the creator's messages and return a JSON object with this EXACT structure:

{
  "writingMechanics": {
    "capitalization": {
      "sentenceStart": "always|often|sometimes|rarely|never",
      "examples": ["example from their text", "another example"]
    },
    "punctuation": {
      "periods": "always|often|sometimes|rarely|never",
      "commas": "often|sometimes|rarely",
      "ellipsis": "heavy|moderate|light|never",
      "exclamationMarks": "heavy|moderate|light|never",
      "questionMarks": "normal|light|never",
      "overall": "high|medium|low"
    },
    "emoji": {
      "frequency": "none|minimal|moderate|heavy",
      "position": "end|mid|start|standalone|mixed",
      "style": "single|clusters|none",
      "favorites": ["emoji1", "emoji2"],
      "mirrors_fan": true|false
    },
    "abbreviations": {
      "uses": ["lol", "tbh", "omg"],
      "avoids": ["idk", "rn"],
      "textSpeak": "heavy|moderate|light|none",
      "examples": ["u vs you", "ur vs your"]
    },
    "formality": {
      "pronouns": "u|you|mixed",
      "contractions": "always|sometimes|never",
      "profanity": "none|light|moderate|heavy",
      "softeners": "heavy|moderate|light|none",
      "examples": ["maybe", "kinda", "I think"]
    },
    "messageStructure": {
      "typicalLength": "very-short|short|medium|long",
      "multipleMessages": true|false,
      "lineBreaks": true|false,
      "letterStretching": "heavy|moderate|light|none",
      "examples": ["hiii", "sooo", "ohhh"]
    }
  },
  "signaturePatterns": {
    "greetings": ["hey", "hii"],
    "petNames": ["babe", "hun"],
    "closings": ["ttyl", "bye"],
    "fillerWords": ["like", "honestly"],
    "uniquePhrases": ["that's so sweet"]
  },
  "neverDoes": {
    "behaviors": [
      "Never uses emojis",
      "Never says 'babe' or pet names",
      "Never uses exclamation marks"
    ],
    "critical": true
  },
  "voiceModes": {
    "casualChat": {
      "tone": "relaxed and brief",
      "example": "haha yeah that's cool"
    },
    "flirting": {
      "tone": "playful but not over the top",
      "example": "you're sweet"
    },
    "customRequests": {
      "tone": "direct and confident",
      "example": "I can do that for $50"
    },
    "complimentResponse": {
      "tone": "humble but accepting",
      "example": "aw thanks"
    }
  },
  "chatterPlaybook": {
    "quickRules": [
      "Start sentences lowercase",
      "No periods at end of messages",
      "One emoji max per message, always at end",
      "Say 'you' not 'u'",
      "Keep replies under 15 words"
    ],
    "doNot": [
      "Don't use exclamation marks",
      "Don't say pet names like babe or hun",
      "Don't use multiple emojis together",
      "Don't write long paragraphs"
    ],
    "copyTheseExactly": [
      "haha",
      "that's sweet",
      "thanks babe"
    ],
    "replyTemplates": {
      "smallTalk": "keep it short, one sentence max",
      "compliment": "say thanks + small deflection",
      "customRequest": "state price directly, no hesitation",
      "boundary": "polite but firm, no apologies"
    },
    "confidence": "high|medium|low"
  }
}

IMPORTANT RULES FOR YOUR ANALYSIS:
1. Look at ACTUAL behavior, not grammar rules. If they never use periods, that's the rule.
2. "Never" is just as important as "always" - identify what they DON'T do.
3. Use their ACTUAL examples from the conversation.
4. Keep quickRules and doNot lists SHORT and CLEAR - max 6 items each.
5. If something is unclear or you're guessing, say confidence is "low".
6. Write for someone who speaks English as a second language - be simple and direct.
7. No fluffy descriptions - just tell chatters exactly what to do.`

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
 * Analyzes the complete conversation to extract behavior-level idiolect
 */
async function handleVibeCheckAnalyze(body: any, apiKey: string) {
  const { conversation } = body
  
  if (!conversation || !Array.isArray(conversation)) {
    return new Response(
      JSON.stringify({ error: 'Missing conversation array' }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Extract only creator messages for focused analysis
  const creatorMessages = conversation
    .filter((msg: any) => msg.role === 'creator')
    .map((msg: any) => msg.content)
  
  // Build analysis request for Grok
  const messages = [
    { role: 'system', content: VIBE_CHECK_ANALYSIS_SYSTEM },
    { 
      role: 'user', 
      content: `Analyze these messages from an OnlyFans creator. Extract their exact texting style so chatters can copy it.

CREATOR'S MESSAGES (analyze these):
${creatorMessages.map((msg: string, i: number) => `${i + 1}. "${msg}"`).join('\n')}

FULL CONVERSATION CONTEXT:
${conversation.map((msg: any) => `${msg.role === 'fan' ? 'Fan' : 'Creator'}: ${msg.content}`).join('\n')}

Return ONLY the JSON object. No explanation, no markdown, just valid JSON.`
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
      temperature: 0.2,
      max_tokens: 3000
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
