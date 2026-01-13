import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// CORS headers for preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper to parse URL-encoded form data (Twilio sends application/x-www-form-urlencoded)
function parseFormData(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    console.log('📥 Incoming Twilio webhook request');

    // Parse the form data from Twilio
    const bodyText = await req.text();
    const data = parseFormData(bodyText);

    console.log('📋 Twilio webhook data:', {
      From: data.From,
      To: data.To,
      Body: data.Body?.substring(0, 50) + (data.Body?.length > 50 ? '...' : ''),
      MessageSid: data.MessageSid,
      NumMedia: data.NumMedia,
    });

    // Extract the key fields
    const fromNumber = data.From; // Sender's phone number (E.164 format)
    const toNumber = data.To; // Your Twilio number
    const messageBody = data.Body || '';
    const messageSid = data.MessageSid;

    if (!fromNumber || !messageSid) {
      console.error('❌ Missing required fields: From or MessageSid');
      // Return empty TwiML to acknowledge receipt but not respond
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/xml',
          },
        }
      );
    }

    // Initialize Supabase client with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Find or create the conversation for this phone number
    console.log('🔍 Looking for existing conversation with:', fromNumber);

    let conversationId: string;

    // First, try to find existing conversation
    const { data: existingConvo, error: findError } = await supabase
      .from('sms_conversations')
      .select('id, client_id')
      .eq('phone_number', fromNumber)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      console.error('❌ Error finding conversation:', findError);
      throw findError;
    }

    if (existingConvo) {
      conversationId = existingConvo.id;
      console.log('✅ Found existing conversation:', conversationId);
    } else {
      // Create new conversation
      console.log('📝 Creating new conversation for:', fromNumber);

      // Try to find a client with this phone number and get tenant_id
      const { data: clientMatch } = await supabase
        .from('clients')
        .select('id, tenant_id')
        .eq('phone', fromNumber)
        .single();

      const tenantId = clientMatch?.tenant_id || null;
      
      if (tenantId) {
        console.log('✅ Found tenant_id from client:', tenantId);
      } else {
        console.warn('⚠️ No tenant_id found - conversation will not be tenant-isolated');
      }

      const { data: newConvo, error: createError } = await supabase
        .from('sms_conversations')
        .insert({
          phone_number: fromNumber,
          client_id: clientMatch?.id || null,
          tenant_id: tenantId,
        })
        .select('id')
        .single();

      if (createError) {
        // Handle race condition - conversation might have been created by another request
        if (createError.code === '23505') {
          // Unique constraint violation
          const { data: raceConvo } = await supabase
            .from('sms_conversations')
            .select('id')
            .eq('phone_number', fromNumber)
            .single();

          if (raceConvo) {
            conversationId = raceConvo.id;
            console.log('✅ Found conversation after race condition:', conversationId);
          } else {
            throw createError;
          }
        } else {
          console.error('❌ Error creating conversation:', createError);
          throw createError;
        }
      } else {
        conversationId = newConvo.id;
        console.log('✅ Created new conversation:', conversationId);
      }
    }

    // Get tenant_id from the conversation for the message
    let tenantId: string | null = null;
    if (existingConvo) {
      // If using existing conversation, get its tenant_id
      const { data: convoData } = await supabase
        .from('sms_conversations')
        .select('tenant_id')
        .eq('id', conversationId)
        .single();
      tenantId = convoData?.tenant_id || null;
    } else {
      // We just created the conversation, get tenant from client
      const { data: clientMatch } = await supabase
        .from('clients')
        .select('tenant_id')
        .eq('phone', fromNumber)
        .single();
      tenantId = clientMatch?.tenant_id || null;
    }

    // Insert the inbound message
    console.log('📝 Inserting inbound message...');

    const { data: insertedMessage, error: insertError } = await supabase
      .from('sms_messages')
      .insert({
        conversation_id: conversationId,
        direction: 'inbound',
        body: messageBody,
        twilio_sid: messageSid,
        status: 'received',
        tenant_id: tenantId,
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('❌ Error inserting message:', insertError);
      throw insertError;
    }

    console.log('✅ Message inserted successfully:', insertedMessage.id);

    // Return empty TwiML response (no auto-reply)
    // If you want to auto-reply, you can add a <Message> element here
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error: any) {
    console.error('💥 Error processing Twilio webhook:', error);

    // Still return 200 to Twilio to prevent retries
    // Log the error but don't expose it
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/xml',
        },
      }
    );
  }
});

