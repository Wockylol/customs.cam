import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileUrl } = await req.json()

    if (!fileUrl) {
      return new Response(
        JSON.stringify({ error: 'fileUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate it's an R2 URL for security (only allow our R2 bucket)
    const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL')
    if (R2_PUBLIC_URL && !fileUrl.startsWith(R2_PUBLIC_URL)) {
      console.error('[R2 Download Proxy] Invalid URL - not from our R2 bucket:', fileUrl)
      return new Response(
        JSON.stringify({ error: 'Invalid file URL - must be from configured R2 bucket' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[R2 Download Proxy] Fetching file:', fileUrl)

    // Fetch the file from R2 (server-side, no CORS issues)
    const response = await fetch(fileUrl)
    
    if (!response.ok) {
      console.error('[R2 Download Proxy] R2 fetch failed:', response.status, response.statusText)
      return new Response(
        JSON.stringify({ error: `Failed to fetch file: ${response.status} ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the file content and headers
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    const contentLength = response.headers.get('content-length')
    const fileData = await response.arrayBuffer()

    console.log('[R2 Download Proxy] File fetched successfully, size:', fileData.byteLength, 'bytes')

    // Return the file with CORS headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': contentType,
    }
    
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength
    }

    return new Response(fileData, {
      status: 200,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[R2 Download Proxy] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

