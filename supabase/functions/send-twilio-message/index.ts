import Twilio from 'npm:twilio@4.22.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Load and validate env vars
    const accountSid   = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken    = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    console.log('🔍 Environment check:', {
      hasAccountSid:   !!accountSid,
      hasAuthToken:    !!authToken,
      hasTwilioNumber: !!twilioNumber,
    });

    const missingVars: string[] = [];
    if (!accountSid)   missingVars.push('TWILIO_ACCOUNT_SID');
    if (!authToken)    missingVars.push('TWILIO_AUTH_TOKEN');
    if (!twilioNumber) missingVars.push('TWILIO_PHONE_NUMBER');
    if (missingVars.length) {
      throw new Error(`Missing Twilio configuration: ${missingVars.join(', ')}`);
    }

    // Parse request body
    const { phoneNumber, content, sentBy } = await req.json();
    if (!phoneNumber || !content) {
      throw new Error('Phone number and content are required');
    }

    console.log('📤 Outgoing request to Twilio:', {
      to:            phoneNumber,
      contentLength: content.length,
      from:          twilioNumber,
      sentBy:        sentBy || 'not provided',
    });

    // Initialize Twilio client
    const client = new Twilio(accountSid, authToken);
    console.log('🔄 Initializing Twilio request with:', {
      accountSid:     `${accountSid.slice(0,4)}…${accountSid.slice(-4)}`,
      phoneNumber,
      twilioNumber,
      contentPreview: content.length > 50
        ? content.slice(0, 50) + '…'
        : content,
    });

    // Send the SMS
    const message = await client.messages.create({
      from: twilioNumber,
      to:   phoneNumber,
      body: content,
    });

    console.log('📥 Twilio API response:', {
      sid:         message.sid,
      status:      message.status,
      direction:   message.direction,
      errorCode:   message.errorCode,
      errorMessage: message.errorMessage,
      dateCreated: message.dateCreated,
      dateUpdated: message.dateUpdated,
      numSegments: message.numSegments,
      price:       message.price,
      priceUnit:   message.priceUnit,
    });

    // Only log to database if the message was successfully sent (has a SID)
    if (message.sid) {
      console.log('📝 Logging successful outbound message to database...');
      
      try {
        // Initialize Supabase client with service role
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          });

          // Find or create conversation for this phone number
          let conversationId: string;

          const { data: existingConvo, error: findError } = await supabase
            .from('sms_conversations')
            .select('id')
            .eq('phone_number', phoneNumber)
            .single();

          if (findError && findError.code !== 'PGRST116') {
            console.error('❌ Error finding conversation:', findError);
          }

          if (existingConvo) {
            conversationId = existingConvo.id;
            console.log('✅ Found existing conversation:', conversationId);
          } else {
            // Create new conversation
            console.log('📝 Creating new conversation for:', phoneNumber);

            // Try to find a client with this phone number
            const { data: clientMatch } = await supabase
              .from('clients')
              .select('id')
              .eq('phone', phoneNumber)
              .single();

            const { data: newConvo, error: createError } = await supabase
              .from('sms_conversations')
              .insert({
                phone_number: phoneNumber,
                client_id: clientMatch?.id || null,
              })
              .select('id')
              .single();

            if (createError) {
              // Handle race condition
              if (createError.code === '23505') {
                const { data: raceConvo } = await supabase
                  .from('sms_conversations')
                  .select('id')
                  .eq('phone_number', phoneNumber)
                  .single();

                if (raceConvo) {
                  conversationId = raceConvo.id;
                } else {
                  throw createError;
                }
              } else {
                throw createError;
              }
            } else {
              conversationId = newConvo.id;
              console.log('✅ Created new conversation:', conversationId);
            }
          }

          // Insert the outbound message
          const { error: insertError } = await supabase
            .from('sms_messages')
            .insert({
              conversation_id: conversationId,
              direction: 'outbound',
              body: content,
              twilio_sid: message.sid,
              status: message.status || 'sent',
              sent_by: sentBy || null,
            });

          if (insertError) {
            console.error('❌ Error inserting message:', insertError);
          } else {
            console.log('✅ Outbound message logged successfully');
          }
        } else {
          console.warn('⚠️ Supabase not configured, skipping message logging');
        }
      } catch (logError: any) {
        // Don't fail the request if logging fails
        console.error('❌ Error logging message to database:', logError);
      }
    }

    // Success response
    return new Response(
      JSON.stringify({
        success:   true,
        messageId: message.sid,
        status:    message.status,
      }),
      {
        status:  200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('❌ Error in send-twilio-message:', error);
    console.error('❌ Detailed error information:', {
      name:            error.name,
      code:            error.code,
      status:          error.status,
      moreInfo:        error.moreInfo,
      details:         error.details,
      stack:           error.stack,
      twilioResponse:  error.response?.data,
      twilioStatusCode: error.response?.status,
    });

    // Map Twilio error codes to HTTP statuses and messages
    let status       = 500;
    let errorMessage = error.message || 'Failed to send message';

    if (error.code) {
      console.log('🔍 Processing Twilio error code:', error.code);
      switch (error.code) {
        case 21211:
          status       = 400;
          errorMessage = 'Invalid phone number format';
          break;
        case 20003:
          status       = 401;
          errorMessage = 'Authentication failed – invalid Twilio credentials';
          break;
        case 21608:
          status       = 400;
          errorMessage = 'Invalid Twilio phone number';
          break;
        case 21614:
          status       = 400;
          errorMessage = 'Invalid phone number – not a mobile number';
          break;
        case 20404:
          status       = 404;
          errorMessage = 'The requested resource was not found';
          break;
        case 20429:
          status       = 429;
          errorMessage = 'Too many requests – rate limit exceeded';
          break;
      }
    }

    console.log('📤 Sending error response:', {
      errorMessage,
      status,
      code: error.code,
    });

    return new Response(
      JSON.stringify({
        error:   errorMessage,
        code:    error.code,
        details: error.message,
      }),
      {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
