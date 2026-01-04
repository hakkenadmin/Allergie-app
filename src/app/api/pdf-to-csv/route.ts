import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  let uploadedFile: any = null
  let assistant: any = null
  
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured. Please set OPENAI_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Convert File to OpenAI File format
    const fileBuffer = await file.arrayBuffer()
    const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' })
    const openaiFile = new File([fileBlob], file.name, { type: 'application/pdf' })

    // Upload file to OpenAI
    uploadedFile = await openai.files.create({
      file: openaiFile,
      purpose: 'assistants',
    })

    console.log('File uploaded:', uploadedFile.id)

    // Create an assistant with file_search tool - allows direct PDF reading without OCR
    assistant = await openai.beta.assistants.create({
      name: 'PDF to CSV Converter',
      instructions: `You are a PDF to CSV converter specialized in restaurant menu data.

INPUT
- A PDF file containing restaurant menu and allergen information.
- The PDF may include:
  - tables
  - symbols like ● ○ ✓
  - headers and category rows
  - disclaimer / note sentences

GOAL
Read the PDF file directly (it is attached to the message) and output a CSV that EXACTLY matches the format below.

CSV FORMAT (MUST MATCH EXACTLY)
メニュー名,説明,価格,カテゴリ,アレルギー,備考,公開

RULES
1. Each row represents ONE actual menu item.
2. Remove all non-menu rows:
   - disclaimers
   - notes
   - headers
   - category titles
3. Do NOT invent menu items.
4. Do NOT invent descriptions, prices, or categories.
5. 公開 is always "true".
6. 説明, 価格, 備考 are empty if not found in the PDF.
7. If a field is missing or cannot be determined, leave it empty (no spaces).
8. カテゴリ should be extracted from section headers if available.
9. アレルギー must be in the format [1,2,3] (array of numbers) or empty [] if no allergies.
10. Allergy numbers should match common allergy IDs (1-30 range typically).
11. Output ONLY the CSV content, no explanations, no markdown formatting, just pure CSV.

OUTPUT FORMAT:
- First line: メニュー名,説明,価格,カテゴリ,アレルギー,備考,公開
- Each subsequent line: one menu item with comma-separated values
- Use quotes for fields containing commas
- Empty fields should be left empty (no spaces)`,
      model: 'gpt-3.5-turbo',
      tools: [{ type: 'file_search' }], // file_search allows reading PDFs directly without OCR
    })

    console.log('Assistant created:', assistant.id)

    // Create a thread with the PDF file attached to the message
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: 'Please read the attached PDF file and convert it to CSV format following the exact format specified in your instructions. Output only the CSV content.',
          attachments: [
            {
              file_id: uploadedFile.id,
              tools: [{ type: 'file_search' }], // file_search tool allows reading PDFs directly
            },
          ],
        },
      ],
    })

    console.log('Thread created:', thread.id)

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    })

    console.log('Run created:', run.id)

    // Poll for completion
    let runStatus = run
    let attempts = 0
    const maxAttempts = 120 // 2 minutes timeout

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      if (attempts >= maxAttempts) {
        // Clean up
        await openai.files.delete(uploadedFile.id).catch(() => {})
        await openai.beta.assistants.delete(assistant.id).catch(() => {})
        return NextResponse.json(
          { error: 'Request timeout. The PDF processing took too long.' },
          { status: 504 }
        )
      }

      await new Promise((resolve) => setTimeout(resolve, 2000)) // Check every 2 seconds
      
      try {
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id })
        console.log(`Run status (attempt ${attempts + 1}):`, runStatus.status)
      } catch (pollError: any) {
        console.error('Poll error:', pollError)
        // Clean up resources
        await openai.files.delete(uploadedFile.id).catch(() => {})
        await openai.beta.assistants.delete(assistant.id).catch(() => {})
        return NextResponse.json(
          { error: `Failed to poll run status: ${pollError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }
      attempts++
    }

    if (runStatus.status === 'completed') {
      // Get the messages
      const messages = await openai.beta.threads.messages.list(thread.id)
      const lastMessage = messages.data[0]

      if (lastMessage && lastMessage.content && lastMessage.content[0] && lastMessage.content[0].type === 'text') {
        let csvContent = lastMessage.content[0].text.value

        // Clean up the CSV content (remove markdown code blocks if present)
        csvContent = csvContent.replace(/```csv\n?/g, '').replace(/```\n?/g, '').trim()

        // Clean up resources
        await openai.files.delete(uploadedFile.id).catch(() => {})
        await openai.beta.assistants.delete(assistant.id).catch(() => {})

        console.log('CSV generated successfully')
        return NextResponse.json({ csv: csvContent })
      } else {
        // Clean up resources
        await openai.files.delete(uploadedFile.id).catch(() => {})
        await openai.beta.assistants.delete(assistant.id).catch(() => {})

        return NextResponse.json(
          { error: 'Unexpected response format from AI' },
          { status: 500 }
        )
      }
    } else {
      // Clean up resources
      await openai.files.delete(uploadedFile.id).catch(() => {})
      await openai.beta.assistants.delete(assistant.id).catch(() => {})

      return NextResponse.json(
        { error: `AI processing failed: ${runStatus.status}. ${runStatus.last_error?.message || ''}` },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('PDF to CSV error:', error)
    
    // Try to clean up resources if they exist
    try {
      if (uploadedFile?.id) await openai.files.delete(uploadedFile.id).catch(() => {})
      if (assistant?.id) await openai.beta.assistants.delete(assistant.id).catch(() => {})
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError)
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to process PDF' },
      { status: 500 }
    )
  }
}
