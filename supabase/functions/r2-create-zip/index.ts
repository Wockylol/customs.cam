import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { JSZip } from 'https://deno.land/x/jszip@0.11.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, Accept',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FileToZip {
  url: string
  fileName: string
  folderPath?: string // e.g., "Step_1" or "ClientName/Step_1"
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { files, zipFileName } = await req.json() as { 
      files: FileToZip[]
      zipFileName?: string 
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ error: 'files array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate URLs are from our R2 bucket
    const R2_PUBLIC_URL = Deno.env.get('R2_PUBLIC_URL')
    if (R2_PUBLIC_URL) {
      for (const file of files) {
        if (!file.url.startsWith(R2_PUBLIC_URL)) {
          return new Response(
            JSON.stringify({ error: `Invalid file URL - must be from configured R2 bucket: ${file.url}` }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    console.log(`[R2 Create ZIP] Creating ZIP with ${files.length} files`)
    const startTime = Date.now()

    const zip = new JSZip()
    const failed: string[] = []

    // Fetch all files in parallel (server-side, no CORS issues!)
    const fetchPromises = files.map(async (file) => {
      try {
        const response = await fetch(file.url)
        if (!response.ok) {
          console.error(`Failed to fetch ${file.fileName}: ${response.status}`)
          failed.push(file.fileName)
          return null
        }
        const data = await response.arrayBuffer()
        return { file, data }
      } catch (err) {
        console.error(`Error fetching ${file.fileName}:`, err)
        failed.push(file.fileName)
        return null
      }
    })

    const results = await Promise.all(fetchPromises)
    
    console.log(`[R2 Create ZIP] Fetched files in ${Date.now() - startTime}ms`)

    // Add files to ZIP
    for (const result of results) {
      if (result) {
        const path = result.file.folderPath 
          ? `${result.file.folderPath}/${result.file.fileName}`
          : result.file.fileName
        zip.file(path, result.data)
      }
    }

    // Generate ZIP
    const zipStartTime = Date.now()
    const zipData = await zip.generateAsync({ 
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 1 } // Fast compression
    })
    
    console.log(`[R2 Create ZIP] ZIP generated in ${Date.now() - zipStartTime}ms, size: ${(zipData.length / 1024 / 1024).toFixed(2)}MB`)
    console.log(`[R2 Create ZIP] Total time: ${Date.now() - startTime}ms`)

    const finalFileName = zipFileName || `download_${Date.now()}.zip`

    // Return ZIP file
    return new Response(zipData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${finalFileName}"`,
        'Content-Length': zipData.length.toString(),
        'X-Failed-Files': failed.length.toString(),
      },
    })

  } catch (error) {
    console.error('[R2 Create ZIP] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

