import Twilio from 'npm:twilio@4.22.0';

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
    const { phoneNumber, content } = await req.json();
    if (!phoneNumber || !content) {
      throw new Error('Phone number and content are required');
    }

    console.log('📤 Outgoing request to Twilio:', {
      to:            phoneNumber,
      contentLength: content.length,
      from:          twilioNumber,
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

