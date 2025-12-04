interface SendSMSOptions {
  phoneNumber: string;
  content: string;
}

export async function sendSMS({ phoneNumber, content }: SendSMSOptions) {
  try {
    console.log('Sending SMS:', {
      phoneNumber,
      contentLength: content.length
    });

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-twilio-message`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ phoneNumber, content }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Error response:', {
        status: response.status,
        statusText: response.statusText,
        data
      });

      throw new Error(data.error || `Failed to send SMS: ${response.statusText}`);
    }

    console.log('Success response:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('SMS sending error:', {
      name: error?.name,
      message: error?.message,
      cause: error?.cause
    });
    throw error;
  }
}

