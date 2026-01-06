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
    console.log('📊 Incoming Twilio delivery status callback');

    // Parse the form data from Twilio
    const bodyText = await req.text();
    const data = parseFormData(bodyText);

    console.log('📋 Delivery status data:', {
      MessageSid: data.MessageSid,
      MessageStatus: data.MessageStatus,
      To: data.To,
      From: data.From,
      ErrorCode: data.ErrorCode,
      ErrorMessage: data.ErrorMessage,
    });

    // Extract the key fields
    const messageSid = data.MessageSid;
    const messageStatus = data.MessageStatus; // queued, sent, delivered, failed, undelivered
    const errorCode = data.ErrorCode || null;
    const errorMessage = data.ErrorMessage || null;

    if (!messageSid) {
      console.warn('⚠️ No MessageSid provided');
      return new Response('OK', {
        status: 200,
        headers: corsHeaders,
      });
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

    // Update the message status in database
    console.log('🔄 Updating message status for SID:', messageSid);

    const { data: updateData, error: updateError } = await supabase
      .from('sms_messages')
      .update({
        status: messageStatus,
        error_code: errorCode,
        error_message: errorMessage,
      })
      .eq('twilio_sid', messageSid)
      .select('id, conversation_id, status');

    if (updateError) {
      console.error('❌ Error updating message status:', updateError);
      throw updateError;
    }

    if (updateData && updateData.length > 0) {
      console.log('✅ Successfully updated message status:', {
        messageId: updateData[0].id,
        conversationId: updateData[0].conversation_id,
        newStatus: messageStatus,
      });
    } else {
      console.warn('⚠️ No message found with SID:', messageSid);
    }

    // Return 200 OK to Twilio to acknowledge receipt
    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('💥 Error processing delivery status callback:', error);

    // Still return 200 to Twilio to prevent retries
    // Log the error but don't expose it
    return new Response('OK', {
      status: 200,
      headers: corsHeaders,
    });
  }
});

