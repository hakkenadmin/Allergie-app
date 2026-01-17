import { NextRequest, NextResponse } from 'next/server'
import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  ExportPDFParams,
  ExportPDFTargetFormat,
  ExportPDFJob,
  ExportPDFResult,
} from '@adobe/pdfservices-node-sdk'
import { Readable } from 'stream'

// Configure runtime for longer processing times
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes (Vercel Pro plan limit)

/**
 * Converts PDF to Excel using Adobe PDF Services API
 */
export async function POST(request: NextRequest) {
  let tempFilePath: string | null = null

  try {
    // Debug: Log environment variable status (without exposing values)
    const hasClientId = !!process.env.PDF_SERVICES_CLIENT_ID
    const hasClientSecret = !!process.env.PDF_SERVICES_CLIENT_SECRET
    
    console.log('Environment variables check:', {
      PDF_SERVICES_CLIENT_ID: hasClientId ? `SET (${process.env.PDF_SERVICES_CLIENT_ID?.substring(0, 10)}...)` : 'NOT SET',
      PDF_SERVICES_CLIENT_SECRET: hasClientSecret ? 'SET' : 'NOT SET',
    })
    
    // Check if API credentials are configured
    if (!hasClientId || !hasClientSecret) {
      console.error('Missing environment variables:', {
        PDF_SERVICES_CLIENT_ID: hasClientId,
        PDF_SERVICES_CLIENT_SECRET: hasClientSecret,
      })
      return NextResponse.json(
        {
          error:
            'Adobe PDF Services API credentials are not configured. Please set PDF_SERVICES_CLIENT_ID and PDF_SERVICES_CLIENT_SECRET in your environment variables.',
        },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Check file size (100MB limit for Adobe PDF Services)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 100MB limit' },
        { status: 400 }
      )
    }

    // Convert File to buffer
    const fileBuffer = await file.arrayBuffer()
    const pdfBytes = Buffer.from(fileBuffer)

    // Initialize Adobe PDF Services credentials
    const clientId = process.env.PDF_SERVICES_CLIENT_ID
    const clientSecret = process.env.PDF_SERVICES_CLIENT_SECRET
    
    if (!clientId || !clientSecret) {
      throw new Error(
        'Adobe PDF Services API credentials are missing. Please set PDF_SERVICES_CLIENT_ID and PDF_SERVICES_CLIENT_SECRET in your environment variables.'
      )
    }

    console.log('Initializing Adobe PDF Services with client ID:', clientId.substring(0, 10) + '...')
    
    const credentials = new ServicePrincipalCredentials({
      clientId,
      clientSecret,
    })

    const pdfServices = new PDFServices({ credentials })

    // Create a readable stream from the buffer
    const pdfStream = Readable.from(pdfBytes)

    // Upload PDF to Adobe PDF Services
    const inputAsset = await pdfServices.upload({
      readStream: pdfStream,
      mimeType: MimeType.PDF,
    })

    console.log('PDF uploaded to Adobe PDF Services')

    // Create export parameters for Excel format
    const params = new ExportPDFParams({
      targetFormat: ExportPDFTargetFormat.XLSX,
    })

    // Create and submit the export job
    const job = new ExportPDFJob({
      inputAsset,
      params,
    })

    console.log('Submitting export job...')
    
    // Submit the job and get location (polling URL)
    // Following Python example: location = pdf_services.submit(export_pdf_job)
    let location: string
    
    try {
      // Try both calling styles: direct job (like Python) and object style
      let submitResponse: any
      
      try {
        // Try direct job argument first (matching Python example)
        submitResponse = await (pdfServices as any).submit(job)
      } catch (e: any) {
        // If that fails, try object style
        submitResponse = await pdfServices.submit({ job })
      }
      
      // The submit method should return a location string directly (like Python example)
      if (typeof submitResponse === 'string') {
        location = submitResponse
      } else if (submitResponse && typeof submitResponse === 'object') {
        // If it returns an object, try to extract location
        location = submitResponse.location || submitResponse.pollingUrl || submitResponse.url || ''
      } else {
        location = ''
      }
      
      if (!location || location.trim() === '') {
        console.error('Submit response type:', typeof submitResponse)
        console.error('Submit response:', submitResponse)
        throw new Error(
          'Failed to get location from job submission. The API did not return a valid location/polling URL. Please check your credentials and try again.'
        )
      }
      
      console.log('Job submitted. Location:', location)
    } catch (submitError: any) {
      console.error('Job submission error:', submitError)
      console.error('Error details:', {
        message: submitError.message,
        stack: submitError.stack,
      })
      
      if (submitError.message?.includes('credentials') || submitError.message?.includes('authentication')) {
        throw new Error(
          'Authentication failed. Please verify your PDF_SERVICES_CLIENT_ID and PDF_SERVICES_CLIENT_SECRET are correct.'
        )
      }
      
      throw new Error(
        `Job submission failed: ${submitError.message || 'Unknown error'}. Please check your credentials and try again.`
      )
    }

    // Get job result
    // The SDK expects pollingUrl parameter (the location from submit is the polling URL)
    let pdfServicesResponse: ExportPDFResult
    
    try {
      console.log('Getting job result with polling URL:', location)
      
      // Ensure location is a string and not empty
      const pollingURL = String(location).trim()
      
      if (!pollingURL) {
        throw new Error('Location is empty or invalid')
      }
      
      console.log('Calling getJobResult with pollingURL:', pollingURL.substring(0, 50) + '...')
      
      // The SDK expects pollingURL (capital URL) parameter based on official examples
      pdfServicesResponse = await pdfServices.getJobResult({
        pollingURL: pollingURL, // Use capital URL as per SDK documentation
        resultType: ExportPDFResult,
      })
      
      console.log('Job result received, status:', pdfServicesResponse?.status)
    } catch (getResultError: any) {
      console.error('Get job result error:', getResultError)
      console.error('Location used:', location)
      console.error('Error message:', getResultError.message)
      console.error('Error stack:', getResultError.stack)
      
      // If it's a polling URL error, provide helpful message
      if (getResultError.message?.includes('Polling URL') || getResultError.message?.includes('null or empty')) {
        throw new Error(
          `Failed to get job result: The polling URL "${location}" appears to be invalid. This may be an SDK issue. Please check the Adobe PDF Services SDK documentation.`
        )
      }
      
      throw new Error(
        `Failed to get job result: ${getResultError.message || 'Unknown error'}`
      )
    }

    // Get the result asset (following Python example: result_asset = pdf_services_response.get_result().get_asset())
    // Try different ways to access the result asset
    let resultAsset: any
    
    if (pdfServicesResponse.result?.asset) {
      resultAsset = pdfServicesResponse.result.asset
    } else if ((pdfServicesResponse as any).getResult?.()?.getAsset?.()) {
      resultAsset = (pdfServicesResponse as any).getResult().getAsset()
    } else if ((pdfServicesResponse as any).result) {
      resultAsset = (pdfServicesResponse as any).result
    } else {
      console.error('PDF Services Response structure:', pdfServicesResponse)
      throw new Error('Failed to get result asset from job result. Unexpected response structure.')
    }
    
    if (!resultAsset) {
      throw new Error('Result asset is null or undefined')
    }

    // Get content stream (following Python example: stream_asset = pdf_services.get_content(result_asset))
    const streamAsset = await pdfServices.getContent({ asset: resultAsset })
    
    // Get the input stream (following Python example: stream_asset.get_input_stream())
    const excelStream = streamAsset.readStream || streamAsset.getInputStream?.()
    
    if (!excelStream) {
      throw new Error('Failed to get content stream from result asset')
    }

    // Convert stream to buffer
    const chunks: Buffer[] = []
    
    // Handle both Readable stream and other stream types
    if (excelStream && typeof excelStream === 'object' && 'readStream' in excelStream) {
      // If it's an object with readStream property
      for await (const chunk of (excelStream as any).readStream) {
        chunks.push(Buffer.from(chunk))
      }
    } else if (excelStream && typeof (excelStream as any)[Symbol.asyncIterator] === 'function') {
      // If it's an async iterable
      for await (const chunk of excelStream as any) {
        chunks.push(Buffer.from(chunk))
      }
    } else {
      throw new Error('Unable to read content stream')
    }
    
    const excelBuffer = Buffer.concat(chunks)

    console.log('Excel file generated:', excelBuffer.length, 'bytes')

    // Return the Excel file as a download
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${file.name.replace(
          /\.pdf$/i,
          '.xlsx'
        )}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('PDF to Excel conversion error:', error)

    // Clean up temp file if it exists
    if (tempFilePath) {
      try {
        const fs = await import('fs/promises')
        await fs.unlink(tempFilePath).catch(() => {})
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json(
      {
        error:
          error.message ||
          'Failed to convert PDF to Excel. Please check the file and try again.',
      },
      { status: 500 }
    )
  }
}
