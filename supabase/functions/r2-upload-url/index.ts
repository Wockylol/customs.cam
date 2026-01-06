import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { S3Client, PutObjectCommand } from 'https://esm.sh/@aws-sdk/client-s3@3.454.0'
import { getSignedUrl } from 'https://esm.sh/@aws-sdk/s3-request-presigner@3.454.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { filePath, contentType } = await req.json()

    if (!filePath) {
      return new Response(
        JSON.stringify({ error: 'filePath is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get R2 credentials from environment
    const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')
    const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')
    const R2_ENDPOINT = Deno.env.get('R2_ENDPOINT')
    const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME')
    const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL')

    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET_NAME) {
      console.error('Missing R2 configuration')
      return new Response(
        JSON.stringify({ error: 'R2 storage not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create S3 client configured for R2
    const s3Client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    })

    // Create the PutObject command
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: filePath,
      ContentType: contentType || 'application/octet-stream',
    })

    // Generate presigned URL (valid for 1 hour)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    // Construct the public URL for accessing the file after upload
    const publicUrl = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL.replace(/\/$/, '')}/${filePath}`
      : null

    return new Response(
      JSON.stringify({ 
        signedUrl,
        filePath,
        publicUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

