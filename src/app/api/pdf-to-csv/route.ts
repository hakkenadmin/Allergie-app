import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { PDFDocument } from 'pdf-lib'
import { validateCsv, filterCsvContent, jsonToCsv, type MenuItemJson } from './utils'

// Configure runtime for longer processing times
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes (Vercel Pro plan limit)

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

    // Convert File to buffer
    const fileBuffer = await file.arrayBuffer()
    const pdfBytes = new Uint8Array(fileBuffer)
    
    // Load PDF to check page count
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const pageCount = pdfDoc.getPageCount()
    
    console.log(`PDF has ${pageCount} pages`)
    
    // If PDF has more than 2 pages, split and process page by page
    if (pageCount > 2) {
      console.log(`PDF has ${pageCount} pages (>2), processing page by page...`)
      return await processPdfPageByPage(pdfBytes, file.name, pageCount)
    }
    
    // For PDFs with 2 or fewer pages, process normally
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
      instructions: `You are an expert PDF to CSV converter specialized in restaurant menu data with HIGH ACCURACY requirements.

=== CRITICAL ACCURACY REQUIREMENTS ===
1. READ EVERY CHARACTER CAREFULLY - Do not guess or approximate
2. EXTRACT EXACT TEXT - Copy menu names, descriptions, prices exactly as written
3. VERIFY ALLERGY SYMBOLS - Look carefully at each symbol (● vs ○ vs -)
4. COUNT ALL ITEMS - Process every single menu item, row by row
5. NO SKIPPING - Missing even one item is unacceptable
6. DOUBLE-CHECK - Verify your output matches the PDF content

=== INPUT ANALYSIS ===
The PDF contains restaurant menu and allergen information with:
- Tables with menu items
- Allergy symbols: ● (black/filled circle), ○ (white/empty circle), ▲ (triangle), × (cross), - (dash)
- Headers, category rows, disclaimers, notes
- Multiple pages
- IMPORTANT: Some PDFs (like McDonald's) have 28+ allergy columns - you MUST read ALL columns from first to last
- IMPORTANT: Do NOT stop reading at column 9 (アーモンド) - continue until the LAST column (やまいも)

=== PROCESSING STEPS (FOLLOW STRICTLY) ===
Step 1: Read the ENTIRE PDF from first page to last page
Step 2: Identify ALL menu items (ignore headers, categories, disclaimers)
Step 3: For EACH menu item:
  a. Extract menu name EXACTLY as written
  b. Extract description if present (or leave empty)
  c. Extract price if present (or leave empty)
  d. Extract category from section header if available (or leave empty)
  e. Read allergy symbols CAREFULLY - THIS IS CRITICAL:
     - Find the row for this menu item in the table
     - Read the ENTIRE row from the FIRST column to the LAST column - do not stop early
     - IMPORTANT: Tables often have MANY allergy columns (20+, 25+, 28+ columns) - you MUST read ALL of them
     - Identify ALL allergy columns in the table header row FIRST - count them to know how many to check
     - Check ALL allergy columns from left to right, continuing until you reach the ABSOLUTE END of the row
     - For EACH allergy column in the row (from first to last):
       * Read the column header to identify the allergy name (e.g., えび, 小麦, 卵, アーモンド, あわび, いか, いくら, オレンジ, キウイフルーツ, 牛肉, ごま, さけ, さば, 大豆, 鶏肉, バナナ, 豚肉, まつたけ, もも, やまいも)
       * Check the symbol in that column for this menu item row:
         - ● (black/filled circle) → add Japanese allergy name to 含有アレルギー
         - ○ (white/empty circle) → add Japanese allergy name to 共有アレルギー
         - ▲ (triangle) → add Japanese allergy name to 共有アレルギー (same as ○)
         - × (cross/X) or - (dash) or blank → do NOT include
     - CRITICAL: Read the WHOLE row until the ABSOLUTE END - do not stop reading mid-row
     - CRITICAL: Do NOT stop at column 9 (アーモンド) or any other column - continue to the LAST column
     - CRITICAL: You MUST check EVERY allergy column from start to end of the row - do not skip any
     - CRITICAL: Extract ALL allergies marked with ●, ○, or ▲ - include every single one until the end
     - CRITICAL: If a menu item has 20+ allergies marked, include all 20+, not just the first few
     - CRITICAL: Some allergy columns may be at the far right end (やまいも, もも, まつたけ, etc.) - make sure you read that far
     - CRITICAL: After reading a row, verify you checked ALL columns by comparing to the header row
  f. Extract note if present (or leave empty)
  g. Set 公開 to "true"
Step 4: Output CSV with ALL items and ALL allergies for each item

=== CSV FORMAT (EXACT STRUCTURE REQUIRED) ===
Header (first line): メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開

Data rows format:
- メニュー名: Exact menu name from PDF (use quotes if contains commas)
- 説明: Description text or empty
- 価格: Price number or empty
- カテゴリ: Category name or empty
- 含有アレルギー: Comma-separated Japanese allergy names for ● symbols (e.g., "えび,小麦,卵" or empty "")
- 共有アレルギー: Comma-separated Japanese allergy names for ○ or ▲ symbols (e.g., "かに,乳" or empty "")
- 備考: Note text or empty
- 公開: Always "true"

=== ALLERGY NAMES (CRITICAL - USE JAPANESE NAMES) ===
Extract the Japanese allergy names directly from the PDF column headers or text.
Common allergy names you may find:
えび, かに, 小麦, そば, 卵, 乳, 落花生, アーモンド, あわび, いか,
いくら, オレンジ, カシューナッツ, キウイフルーツ, 牛肉, ごま, さけ,
さば, 大豆, 鶏肉, バナナ, 豚肉, まつたけ, もも, やまいも,
りんご, ゼラチン

IMPORTANT:
- Extract the EXACT Japanese allergy name as written in the PDF
- Use comma-separated Japanese names (e.g., "えび,小麦,卵")
- Do NOT convert to numbers - keep in Japanese
- Match the allergy column header/text in the PDF exactly
- If the PDF uses different names or variations, use what's written in the PDF

=== SYMBOL RECOGNITION (MUST BE ACCURATE) ===
- ● (black/filled circle, solid circle) = 含有アレルギー (contains)
- ○ (white/empty circle, hollow circle) = 共有アレルギー (share)
- ▲ (triangle, upward triangle) = 共有アレルギー (share, same as ○)
- × (cross, X mark) = none (do not include)
- - (dash, hyphen, minus) = none (do not include)
- Blank/empty cell = none (do not include)

CRITICAL: Look VERY carefully - these symbols can look similar. Verify each one.
CRITICAL: Some PDFs use ▲ (triangle) instead of ○ for shared allergies - treat them the same.

=== ALLERGY EXTRACTION - CRITICAL REQUIREMENTS ===
When extracting allergies for each menu item, you MUST:
1. FIRST: Count ALL allergy columns in the header row - tables often have 25+, 28+ columns (e.g., McDonald's has 28 columns)
2. Read the ENTIRE row from FIRST column to LAST column - do not stop reading mid-row
3. Identify ALL allergy columns in the table header FIRST - note the LAST column name (e.g., やまいも, もも, まつたけ)
4. For EACH menu item row, check EVERY allergy column systematically from left to right
5. Continue reading the row until you reach the ABSOLUTE END - verify you reached the LAST column from the header
6. Extract ALL allergies marked with ● - do not skip any, include every single one until the end
7. Extract ALL allergies marked with ○ or ▲ - do not skip any, include every single one until the end
8. CRITICAL: Do NOT stop at column 9 (アーモンド) or any middle column - continue to the LAST column (やまいも)
9. Count the allergies after extraction - if the PDF shows 25 allergies, your output must have 25 (NO LIMIT on number of allergies)
10. CRITICAL: Menu items can have MANY allergies (20+, 25+, 28+ or more) - extract ALL of them, not just some
11. There is NO UPPER LIMIT - if a menu item has 50 allergies, extract all 50
12. Double-check: After extracting allergies for a menu item, verify you read the whole row and got them all
13. CRITICAL: Tables can be VERY wide (28+ columns) - make sure you read ALL columns until the very end of the row
14. CRITICAL: Do NOT stop extracting after a certain number - continue until you reach the ABSOLUTE END of the row
15. VERIFICATION: Compare the number of columns you checked with the header row - they must match

EXAMPLE: If a menu item row has allergies marked in columns: えび(●), 小麦(●), 卵(●), かに(○), 乳(○), そば(●), 落花生(●), アーモンド(○), あわび(●), いか(●), いくら(○), オレンジ(●), カシューナッツ(○), キウイフルーツ(●), 牛肉(○), ごま(●), さけ(○), さば(●), 大豆(○), 鶏肉(●), バナナ(○), 豚肉(●), まつたけ(○), もも(●), やまいも(○)
Your output MUST include ALL 25 allergies: Extract ALL ● symbols to 含有アレルギー and ALL ○/▲ symbols to 共有アレルギー
Do NOT output only the first 5 or 10 - that's incomplete! You must read the ENTIRE row until the end and extract ALL allergies.
CRITICAL: Do NOT stop at アーモンド (column 9) - continue reading until やまいも (the LAST column)!

=== EXAMPLE OUTPUT ===
メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開
ハンバーガー,ジューシーな牛肉パティ,500,メイン,"えび,小麦,卵","かに,乳",,true
サラダ,新鮮な野菜,300,サイド,,"そば",,true
カレーライス,スパイシーなカレー,600,メイン,"えび,小麦","卵",,true

=== STRICT RULES ===
1. Extract EXACT text - do not paraphrase or summarize
2. Process EVERY menu item - count them to ensure none are missed
3. Read symbols CAREFULLY - verify ● vs ○ vs - for each allergy
4. Extract Japanese allergy names directly from PDF (do NOT convert to numbers)
5. CRITICAL - Extract ALL allergies for each menu item:
   - Read the ENTIRE row from FIRST column to LAST column - do not stop reading mid-row
   - Check EVERY allergy column in the table systematically from left to right
   - Continue reading until you reach the END of the row - some allergies may be at the far right
   - Include ALL allergies marked with ● (every single one - do not skip any)
   - Include ALL allergies marked with ○ (every single one - do not skip any)
   - Do NOT skip any allergies - if 30 allergies are marked, include all 30 (NO LIMIT)
   - Count the allergies after extraction to verify completeness
   - Menu items can have 20+, 30+, 40+ or more allergies - extract ALL of them
   - There is NO UPPER LIMIT - continue extracting until you reach the END of the row
   - Verify: After extracting allergies for a menu item, count them and ensure you read the whole row and got them all
   - CRITICAL: Tables can be wide - make sure you read ALL columns until the very end of the row
   - CRITICAL: Do NOT stop after extracting a certain number - continue until the row ends
6. If price has currency symbol, include it or extract number only (be consistent)
7. If description spans multiple lines, combine into one field
8. Category should come from section headers (e.g., "メイン", "サイド", "デザート")
9. Empty fields = "" (empty string, no spaces)
10. Output ONLY CSV - no explanations, no markdown, no code blocks
11. Include header row as first line
12. Continue until ALL pages are processed and ALL items extracted
13. For each menu item, verify you extracted ALL allergies before moving to next item

=== QUALITY CHECK ===
Before outputting, verify:
- All menu items from PDF are included
- Menu names match PDF exactly
- Allergy symbols are correctly identified (● vs ○)
- ALL allergies are extracted for each menu item (count them to verify)
- No allergies are skipped or missed
- Allergy names match column headers exactly
- No items are skipped or duplicated
- CSV format is correct (8 columns per row)

OUTPUT: Pure CSV content only, starting with header row, then all menu items.`,
      model: 'gpt-4o',
      tools: [{ type: 'file_search' }],
      temperature: 0.1, // Lower temperature for more accurate, deterministic output
    })

    console.log('Assistant created:', assistant.id)

    // Create a thread with the PDF file attached to the message
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: `CRITICAL: Read the ENTIRE PDF file (all pages) with MAXIMUM ACCURACY.

REQUIREMENTS:
1. Read EVERY character carefully - do not guess
2. Extract EXACT text for menu names, descriptions, prices
3. Verify EACH allergy symbol carefully (● vs ○ vs -)
4. Process EVERY menu item - count them to ensure completeness
5. Extract ALL allergies for each menu item:
   - Read the ENTIRE row from FIRST column to LAST column - do not stop reading mid-row
   - Check EVERY allergy column in the table systematically from left to right
   - Continue reading until you reach the END of the row - some allergies may be at the far right
   - Include ALL allergies marked with ● (every single one - do not skip any)
   - Include ALL allergies marked with ○ (every single one - do not skip any)
   - Do NOT skip any allergies - extract them completely until the end of the row
   - Menu items can have 20+, 30+, 40+ or more allergies - extract ALL of them (NO LIMIT)
   - There is NO UPPER LIMIT - continue extracting until you reach the END of the row
   - Count allergies after extraction to verify you read the whole row and got them all
   - CRITICAL: Tables can be wide - make sure you read ALL columns until the very end of the row
   - CRITICAL: Do NOT stop after extracting a certain number - continue until the row ends
6. Match allergy column headers to Japanese names correctly
7. Output complete CSV with ALL menu items from ALL pages

Please convert ALL menu items to CSV format following the exact format specified in your instructions. 
Process every single menu item from all pages - do not skip or truncate any items.
For each menu item, extract ALL allergies completely - check every allergy column.
Output only the complete CSV content with all menu items and all allergies, starting with the header row.`,
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
      // Get the messages - check all messages in case response was split across multiple messages
      const messages = await openai.beta.threads.messages.list(thread.id)
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/97df777c-29ce-4f5f-9983-f0ddeca751ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-to-csv/route.ts:171',message:'Messages retrieved from thread',data:{totalMessages:messages.data.length,threadId:thread.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Collect all text content from assistant messages (in case response was split)
      let csvContent = ''
      let messageCount = 0
      let totalContentLength = 0
      for (const message of messages.data) {
        if (message.role === 'assistant' && message.content) {
          messageCount++
          for (const content of message.content) {
            if (content.type === 'text') {
              const textValue = content.text.value
              csvContent += textValue + '\n'
              totalContentLength += textValue.length
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/97df777c-29ce-4f5f-9983-f0ddeca751ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-to-csv/route.ts:182',message:'Collected assistant message content',data:{messageIndex:messageCount,contentLength:textValue.length,firstChars:textValue.substring(0,100),lastChars:textValue.substring(Math.max(0,textValue.length-100))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
              // #endregion
            }
          }
        }
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/97df777c-29ce-4f5f-9983-f0ddeca751ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-to-csv/route.ts:190',message:'Raw CSV content collected',data:{totalLength:csvContent.length,messageCount,rawLineCount:csvContent.split('\n').length,first500Chars:csvContent.substring(0,500),last500Chars:csvContent.substring(Math.max(0,csvContent.length-500))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (!csvContent.trim()) {
        // Clean up resources
        await openai.files.delete(uploadedFile.id).catch(() => {})
        await openai.beta.assistants.delete(assistant.id).catch(() => {})
        return NextResponse.json(
          { error: 'No CSV content received from AI' },
          { status: 500 }
        )
      }

      // Try to extract JSON first (two-step extraction)
      let jsonData: MenuItemJson[] | null = null
      const jsonMatch = csvContent.match(/<JSON>([\s\S]*?)<\/JSON>/i)
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1])
          if (Array.isArray(parsed) && parsed.length > 0) {
            jsonData = parsed
            console.log(`Extracted ${jsonData.length} items from JSON`)
            csvContent = jsonToCsv(jsonData)
          }
        } catch (jsonError) {
          console.warn('Failed to parse JSON, falling back to CSV extraction:', jsonError)
        }
      }

      // Clean up the CSV content (remove markdown code blocks if present)
      const beforeCleanup = csvContent.length
      csvContent = filterCsvContent(csvContent)
      const afterCleanup = csvContent.length

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/97df777c-29ce-4f5f-9983-f0ddeca751ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-to-csv/route.ts:203',message:'After cleanup',data:{beforeCleanup,afterCleanup,cleanupRemoved:beforeCleanup-afterCleanup,lineCountAfterCleanup:csvContent.split('\n').length,extractedFromJson:!!jsonData},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      // Validate CSV
      const validation = validateCsv(csvContent)
      if (!validation.isValid && validation.rowCount === 0) {
        console.warn('CSV validation failed:', validation.errors)
        // If validation fails completely, try retry with more specific instructions
        throw new Error(`CSV validation failed: ${validation.errors.join(', ')}`)
      }

      // Remove duplicate headers if present
      const lines = csvContent.split('\n').filter(line => line.trim())
      const header = lines[0] || 'メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開'
      
      // Filter out explanatory text lines that don't match CSV format
      const dataLines = lines.slice(1).filter(line => {
        const commaCount = (line.match(/,/g) || []).length
        return commaCount >= 6 // Require at least 6 commas (7 fields minimum)
      })
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/97df777c-29ce-4f5f-9983-f0ddeca751ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-to-csv/route.ts:210',message:'After splitting and filtering lines',data:{totalLines:lines.length,headerLine:header,dataLineCountBeforeFilter:lines.length-1,dataLineCountAfterFilter:dataLines.length,validationErrors:validation.errors.length,validationWarnings:validation.warnings.length},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      csvContent = header + '\n' + dataLines.join('\n')

      let finalRowCount = dataLines.length
      let allCsvContent = csvContent
      
      // Check if response seems incomplete (too few rows for a large PDF, or contains "selection" language)
      const rawContentLower = csvContent.toLowerCase()
      const seemsIncomplete = rawContentLower.includes('selection') || 
                              rawContentLower.includes('sample') ||
                              (finalRowCount < 100 && csvContent.length < 10000) // Suspiciously small for large PDFs
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/97df777c-29ce-4f5f-9983-f0ddeca751ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-to-csv/route.ts:245',message:'Checking for incomplete response',data:{finalRowCount,csvLength:csvContent.length,seemsIncomplete,containsSelection:rawContentLower.includes('selection')},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // If response seems incomplete, make a follow-up request for remaining items
      if (seemsIncomplete) {
        console.log('Response seems incomplete, requesting remaining items...')
        
        // Add a follow-up message to the thread
        await openai.beta.threads.messages.create(thread.id, {
          role: 'user',
          content: `The previous response only included ${finalRowCount} menu items, but the PDF contains many more items (likely 200+). Please continue extracting ALL remaining menu items from the PDF. Output ONLY the CSV rows (no header, no explanations) starting from where you left off. Continue until you have extracted EVERY menu item from ALL pages.`,
        })
        
        // Run the assistant again
        const followUpRun = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistant.id,
        })
        
        // Poll for completion
        let followUpStatus = followUpRun
        let followUpAttempts = 0
        const maxFollowUpAttempts = 120
        
        while (followUpStatus.status === 'queued' || followUpStatus.status === 'in_progress') {
          if (followUpAttempts >= maxFollowUpAttempts) {
            console.warn('Follow-up request timed out')
            break
          }
          await new Promise((resolve) => setTimeout(resolve, 2000))
          followUpStatus = await openai.beta.threads.runs.retrieve(followUpRun.id, { thread_id: thread.id })
          followUpAttempts++
        }
        
        if (followUpStatus.status === 'completed') {
          // Get all messages (they're in reverse chronological order)
          const allMessages = await openai.beta.threads.messages.list(thread.id)
          
          // Find the first assistant message ID we already processed
          const firstProcessedMessageId = messages.data.find(m => m.role === 'assistant')?.id
          
          // Collect additional CSV content from new assistant messages
          let additionalCsv = ''
          for (const message of allMessages.data) {
            // Stop when we reach messages we've already processed
            if (message.id === firstProcessedMessageId) break
            
            if (message.role === 'assistant' && message.content) {
              for (const content of message.content) {
                if (content.type === 'text') {
                  additionalCsv += content.text.value + '\n'
                }
              }
            }
          }
          
          if (additionalCsv.trim()) {
            // Clean up additional CSV
            additionalCsv = additionalCsv.replace(/```csv\n?/g, '').replace(/```\n?/g, '').trim()
            const additionalLines = additionalCsv.split('\n').filter(line => line.trim())
            const additionalDataLines = additionalLines.filter(line => {
              const commaCount = (line.match(/,/g) || []).length
              const isExplanatoryText = 
                line.includes('CSV above') || 
                line.includes('represents a selection') ||
                line.includes('extracted from') ||
                line.includes('according to') ||
                line.includes('specified format') ||
                line.includes('Here is') ||
                line.includes('Below is') ||
                line.includes('I have') ||
                line.includes('I will') ||
                line.includes('Please note') ||
                line.includes('Note:') ||
                line.includes('注意') ||
                (commaCount < 6 && line.length > 50)
              // Require at least 6 commas (7 fields minimum) for valid CSV row
              return commaCount >= 6 && !isExplanatoryText && !line.startsWith('メニュー名') // Skip headers
            })
            
            // Append to existing CSV
            allCsvContent = csvContent + '\n' + additionalDataLines.join('\n')
            finalRowCount = dataLines.length + additionalDataLines.length
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/97df777c-29ce-4f5f-9983-f0ddeca751ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-to-csv/route.ts:290',message:'Follow-up response received',data:{additionalRows:additionalDataLines.length,totalRowsNow:finalRowCount},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            
            console.log(`Follow-up added ${additionalDataLines.length} more rows. Total: ${finalRowCount}`)
          }
        }
      }
      
      console.log(`CSV generated: ${finalRowCount} data rows`)

      // Check if the last line looks truncated (ends with comma or incomplete)
      const finalLines = allCsvContent.split('\n').filter(line => line.trim())
      const lastLine = finalLines[finalLines.length - 1] || ''
      const isTruncated = lastLine.endsWith(',') || (lastLine.split(',').length < 7 && finalRowCount > 1)
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/97df777c-29ce-4f5f-9983-f0ddeca751ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pdf-to-csv/route.ts:300',message:'Final CSV stats',data:{finalRowCount,lastLine,isTruncated,lastLineFieldCount:lastLine.split(',').length,expectedFieldCount:7},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      if (isTruncated) {
        console.warn('Warning: CSV response may be truncated - last line appears incomplete')
      }

      // Clean up resources
      await openai.files.delete(uploadedFile.id).catch(() => {})
      await openai.beta.assistants.delete(assistant.id).catch(() => {})

      // Final validation
      const finalValidation = validateCsv(allCsvContent)
      
      console.log('CSV generated successfully')
      return NextResponse.json({ 
        csv: allCsvContent,
        rowCount: finalRowCount,
        validation: {
          isValid: finalValidation.isValid,
          errors: finalValidation.errors,
          warnings: finalValidation.warnings
        },
        warning: isTruncated 
          ? 'Response may be truncated. Please verify all menu items were included.' 
          : finalValidation.warnings.length > 0
            ? finalValidation.warnings.join('; ')
            : undefined
      })
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

// Process PDF page by page for large PDFs (>2 pages)
async function processPdfPageByPage(
  pdfBytes: Uint8Array,
  originalFileName: string,
  totalPages: number
): Promise<NextResponse> {
  let uploadedFiles: string[] = []
  let assistant: any = null
  
  try {
    // Create assistant once (reused for all pages)
    assistant = await openai.beta.assistants.create({
      name: 'PDF to CSV Converter',
      instructions: `You are an expert PDF to CSV converter specialized in restaurant menu data with HIGH ACCURACY requirements.

=== CRITICAL ACCURACY REQUIREMENTS ===
1. READ EVERY CHARACTER CAREFULLY - Do not guess or approximate
2. EXTRACT EXACT TEXT - Copy menu names, descriptions, prices exactly as written
3. VERIFY ALLERGY SYMBOLS - Look carefully at each symbol (● vs ○ vs -)
4. COUNT ALL ITEMS - Process every single menu item on this page, row by row
5. NO SKIPPING - Missing even one item is unacceptable
6. DOUBLE-CHECK - Verify your output matches the PDF content

=== INPUT ANALYSIS ===
This is a SINGLE PAGE from a PDF containing restaurant menu and allergen information with:
- Tables with menu items
- Allergy symbols: ● (black/filled circle), ○ (white/empty circle), - (dash)
- Headers, category rows, disclaimers, notes

=== PROCESSING STEPS (FOLLOW STRICTLY) ===
Step 1: Read the ENTIRE page from top to bottom
Step 2: Identify ALL menu items (ignore headers, categories, disclaimers)
Step 3: For EACH menu item on this page:
  a. Extract menu name EXACTLY as written
  b. Extract description if present (or leave empty)
  c. Extract price if present (or leave empty)
  d. Extract category from section header if available (or leave empty)
  e. Read allergy symbols CAREFULLY - THIS IS CRITICAL:
     - Find the row for this menu item in the table
     - Read the ENTIRE row from the FIRST column to the LAST column - do not stop early
     - IMPORTANT: Tables often have MANY allergy columns (20+, 25+, 28+ columns) - you MUST read ALL of them
     - Identify ALL allergy columns in the table header row FIRST - count them to know how many to check
     - Check ALL allergy columns from left to right, continuing until you reach the ABSOLUTE END of the row
     - For EACH allergy column in the row (from first to last):
       * Read the column header to identify the allergy name (e.g., えび, 小麦, 卵, アーモンド, あわび, いか, いくら, オレンジ, キウイフルーツ, 牛肉, ごま, さけ, さば, 大豆, 鶏肉, バナナ, 豚肉, まつたけ, もも, やまいも)
       * Check the symbol in that column for this menu item row:
         - ● (black/filled circle) → add Japanese allergy name to 含有アレルギー
         - ○ (white/empty circle) → add Japanese allergy name to 共有アレルギー
         - ▲ (triangle) → add Japanese allergy name to 共有アレルギー (same as ○)
         - × (cross/X) or - (dash) or blank → do NOT include
     - CRITICAL: Read the WHOLE row until the ABSOLUTE END - do not stop reading mid-row
     - CRITICAL: Do NOT stop at column 9 (アーモンド) or any other column - continue to the LAST column
     - CRITICAL: You MUST check EVERY allergy column from start to end of the row - do not skip any
     - CRITICAL: Extract ALL allergies marked with ●, ○, or ▲ - include every single one until the end
     - CRITICAL: If a menu item has 20+ allergies marked, include all 20+, not just the first few
     - CRITICAL: Some allergy columns may be at the far right end (やまいも, もも, まつたけ, etc.) - make sure you read that far
     - CRITICAL: After reading a row, verify you checked ALL columns by comparing to the header row
  f. Extract note if present (or leave empty)
  g. Set 公開 to "true"
Step 4: Output CSV rows with ALL items from this page and ALL allergies for each item

=== CSV FORMAT (EXACT STRUCTURE REQUIRED) ===
Data rows format (NO HEADER - header will be added separately):
- メニュー名: Exact menu name from PDF (use quotes if contains commas)
- 説明: Description text or empty
- 価格: Price number or empty
- カテゴリ: Category name or empty
- 含有アレルギー: Comma-separated Japanese allergy names for ● symbols (e.g., "えび,小麦,卵" or empty "")
- 共有アレルギー: Comma-separated Japanese allergy names for ○ or ▲ symbols (e.g., "かに,乳" or empty "")
- 備考: Note text or empty
- 公開: Always "true"

=== ALLERGY NAMES (CRITICAL - USE JAPANESE NAMES) ===
Extract the Japanese allergy names directly from the PDF column headers or text.
Common allergy names you may find:
えび, かに, 小麦, そば, 卵, 乳, 落花生, アーモンド, あわび, いか,
いくら, オレンジ, カシューナッツ, キウイフルーツ, 牛肉, ごま, さけ,
さば, 大豆, 鶏肉, バナナ, 豚肉, まつたけ, もも, やまいも,
りんご, ゼラチン

IMPORTANT:
- Extract the EXACT Japanese allergy name as written in the PDF
- Use comma-separated Japanese names (e.g., "えび,小麦,卵")
- Do NOT convert to numbers - keep in Japanese
- Match the allergy column header/text in the PDF exactly
- If the PDF uses different names or variations, use what's written in the PDF

=== SYMBOL RECOGNITION (MUST BE ACCURATE) ===
- ● (black/filled circle, solid circle) = 含有アレルギー (contains)
- ○ (white/empty circle, hollow circle) = 共有アレルギー (share)
- ▲ (triangle, upward triangle) = 共有アレルギー (share, same as ○)
- × (cross, X mark) = none (do not include)
- - (dash, hyphen, minus) = none (do not include)
- Blank/empty cell = none (do not include)

CRITICAL: Look VERY carefully - these symbols can look similar. Verify each one.
CRITICAL: Some PDFs use ▲ (triangle) instead of ○ for shared allergies - treat them the same.

=== ALLERGY EXTRACTION - CRITICAL REQUIREMENTS ===
When extracting allergies for each menu item, you MUST:
1. FIRST: Count ALL allergy columns in the header row - tables often have 25+, 28+ columns (e.g., McDonald's has 28 columns)
2. Read the ENTIRE row from FIRST column to LAST column - do not stop reading mid-row
3. Identify ALL allergy columns in the table header FIRST - note the LAST column name (e.g., やまいも, もも, まつたけ)
4. For EACH menu item row, check EVERY allergy column systematically from left to right
5. Continue reading the row until you reach the ABSOLUTE END - verify you reached the LAST column from the header
6. Extract ALL allergies marked with ● - do not skip any, include every single one until the end
7. Extract ALL allergies marked with ○ or ▲ - do not skip any, include every single one until the end
8. CRITICAL: Do NOT stop at column 9 (アーモンド) or any middle column - continue to the LAST column (やまいも)
9. Count the allergies after extraction - if the PDF shows 25 allergies, your output must have 25 (NO LIMIT on number of allergies)
10. CRITICAL: Menu items can have MANY allergies (20+, 25+, 28+ or more) - extract ALL of them, not just some
11. There is NO UPPER LIMIT - if a menu item has 50 allergies, extract all 50
12. Double-check: After extracting allergies for a menu item, verify you read the whole row and got them all
13. CRITICAL: Tables can be VERY wide (28+ columns) - make sure you read ALL columns until the very end of the row
14. CRITICAL: Do NOT stop extracting after a certain number - continue until you reach the ABSOLUTE END of the row
15. VERIFICATION: Compare the number of columns you checked with the header row - they must match

EXAMPLE: If a menu item row has allergies marked in columns: えび(●), 小麦(●), 卵(●), かに(○), 乳(○), そば(●), 落花生(●), アーモンド(○), あわび(●), いか(●), いくら(○), オレンジ(●), カシューナッツ(○), キウイフルーツ(●), 牛肉(○), ごま(●), さけ(○), さば(●), 大豆(○), 鶏肉(●), バナナ(○), 豚肉(●), まつたけ(○), もも(●), やまいも(○)
Your output MUST include ALL 25 allergies: Extract ALL ● symbols to 含有アレルギー and ALL ○/▲ symbols to 共有アレルギー
Do NOT output only the first 5 or 10 - that's incomplete! You must read the ENTIRE row until the end and extract ALL allergies.
CRITICAL: Do NOT stop at アーモンド (column 9) - continue reading until やまいも (the LAST column)!

=== EXAMPLE OUTPUT (DATA ROWS ONLY, NO HEADER) ===
ハンバーガー,ジューシーな牛肉パティ,500,メイン,"えび,小麦,卵","かに,乳",,true
サラダ,新鮮な野菜,300,サイド,,"そば",,true
カレーライス,スパイシーなカレー,600,メイン,"えび,小麦","卵",,true

=== STRICT RULES ===
1. Extract EXACT text - do not paraphrase or summarize
2. Process EVERY menu item on this page - count them to ensure none are missed
3. Read symbols CAREFULLY - verify ● vs ○ vs - for each allergy
4. Extract Japanese allergy names directly from PDF (do NOT convert to numbers)
5. CRITICAL - Extract ALL allergies for each menu item:
   - Read the ENTIRE row from FIRST column to LAST column - do not stop reading mid-row
   - Check EVERY allergy column in the table systematically from left to right
   - Continue reading until you reach the END of the row - some allergies may be at the far right
   - Include ALL allergies marked with ● (every single one)
   - Include ALL allergies marked with ○ (every single one)
   - Do NOT skip any allergies - if 30 allergies are marked, include all 30 (NO LIMIT)
   - Count the allergies after extraction to verify completeness
   - Menu items can have 20+, 30+, 40+ or more allergies - extract ALL of them
   - There is NO UPPER LIMIT - continue extracting until you reach the END of the row
   - Verify: After extracting allergies for a menu item, count them and ensure you read the whole row and got them all
   - CRITICAL: Tables can be wide - make sure you read ALL columns until the very end of the row
   - CRITICAL: Do NOT stop after extracting a certain number - continue until the row ends
6. If price has currency symbol, include it or extract number only (be consistent)
7. If description spans multiple lines, combine into one field
8. Category should come from section headers (e.g., "メイン", "サイド", "デザート")
9. Empty fields = "" (empty string, no spaces)
10. Output ONLY CSV data rows - no header, no explanations, no markdown, no code blocks
11. Continue until ALL items on this page are extracted
12. For each menu item, verify you extracted ALL allergies before moving to next item

=== QUALITY CHECK ===
Before outputting, verify:
- All menu items from this page are included
- Menu names match PDF exactly
- Allergy symbols are correctly identified (● vs ○)
- Allergy IDs match column headers
- No items are skipped or duplicated
- CSV format is correct (8 columns per row)

OUTPUT: Pure CSV data rows only (no header), one menu item per line.`,
      model: 'gpt-4o',
      tools: [{ type: 'file_search' }],
      temperature: 0.1, // Lower temperature for more accurate, deterministic output
    })

    console.log('Assistant created for page-by-page processing:', assistant.id)

    const allCsvRows: string[] = []
    const header = 'メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開'
    
    // Process each page separately
    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      console.log(`Processing page ${pageIndex + 1}/${totalPages}...`)
      
      // Load PDF and extract single page
      const pdfDoc = await PDFDocument.load(pdfBytes)
      const newPdfDoc = await PDFDocument.create()
      const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex])
      newPdfDoc.addPage(copiedPage)
      
      // Convert single page PDF to buffer
      const singlePageBytes = await newPdfDoc.save()
      // Create File from Uint8Array - File constructor accepts Uint8Array
      const singlePageFile = new File(
        [singlePageBytes as any],
        `${originalFileName}_page_${pageIndex + 1}.pdf`,
        { type: 'application/pdf' }
      )
      
      // Upload single page to OpenAI
      const uploadedFile = await openai.files.create({
        file: singlePageFile,
        purpose: 'assistants',
      })
      
      uploadedFiles.push(uploadedFile.id)
      console.log(`Page ${pageIndex + 1} uploaded:`, uploadedFile.id)
      
      // Create thread for this page
      const thread = await openai.beta.threads.create({
        messages: [
          {
            role: 'user',
            content: `CRITICAL: Read this PDF page with MAXIMUM ACCURACY.

REQUIREMENTS:
1. Read EVERY character carefully - do not guess
2. Extract EXACT text for menu names, descriptions, prices
3. Verify EACH allergy symbol carefully (● vs ○ vs -)
4. Process EVERY menu item on this page - count them to ensure completeness
5. Match allergy column headers to IDs correctly
6. Output ONLY CSV data rows (no header, no explanations)

CRITICAL: Read this PDF page with MAXIMUM ACCURACY.

REQUIREMENTS:
1. Read EVERY character carefully - do not guess
2. Extract EXACT text for menu names, descriptions, prices
3. Verify EACH allergy symbol carefully (● vs ○ vs -)
4. Process EVERY menu item on this page - count them to ensure completeness
5. Extract ALL allergies for each menu item:
   - Read the ENTIRE row from FIRST column to LAST column - do not stop reading mid-row
   - Check EVERY allergy column in the table systematically from left to right
   - Continue reading until you reach the END of the row - some allergies may be at the far right
   - Include ALL allergies marked with ● (every single one - do not skip any)
   - Include ALL allergies marked with ○ (every single one - do not skip any)
   - Do NOT skip any allergies - extract them completely until the end of the row
   - Menu items can have 20+, 30+, 40+ or more allergies - extract ALL of them (NO LIMIT)
   - There is NO UPPER LIMIT - continue extracting until you reach the END of the row
   - Count allergies after extraction to verify you read the whole row and got them all
   - CRITICAL: Tables can be wide - make sure you read ALL columns until the very end of the row
   - CRITICAL: Do NOT stop after extracting a certain number - continue until the row ends
6. Match allergy column headers to Japanese names correctly
7. Output ONLY CSV data rows (no header, no explanations)

Please read this PDF page and convert ALL menu items to CSV format. 
Output ONLY the CSV data rows (no header, no explanations). 
Process every single menu item from this page with maximum accuracy.
For each menu item, extract ALL allergies completely - read the whole row until the end.`,
            attachments: [
              {
                file_id: uploadedFile.id,
                tools: [{ type: 'file_search' }],
              },
            ],
          },
        ],
      })
      
      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
      })
      
      // Poll for completion
      let runStatus = run
      let attempts = 0
      const maxAttempts = 120
      
      while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
        if (attempts >= maxAttempts) {
          console.warn(`Page ${pageIndex + 1} processing timed out`)
          break
        }
        
        await new Promise((resolve) => setTimeout(resolve, 2000))
        runStatus = await openai.beta.threads.runs.retrieve(run.id, { thread_id: thread.id })
        attempts++
      }
      
      if (runStatus.status === 'completed') {
        // Get messages
        const messages = await openai.beta.threads.messages.list(thread.id)
        
        // Collect CSV content from assistant messages
        let pageCsvContent = ''
        for (const message of messages.data) {
          if (message.role === 'assistant' && message.content) {
            for (const content of message.content) {
              if (content.type === 'text') {
                pageCsvContent += content.text.value + '\n'
              }
            }
          }
        }
        
        // Clean up CSV content
        pageCsvContent = pageCsvContent
          .replace(/```csv\n?/g, '')
          .replace(/```\n?/g, '')
          .trim()
        
        // Extract data rows (filter out headers and explanatory text)
        const lines = pageCsvContent.split('\n').filter(line => line.trim())
        const dataLines = lines.filter(line => {
          // Skip header line
          if (line.startsWith('メニュー名')) return false
          
          // Count commas - valid CSV row should have at least 6 commas (7 fields minimum)
          const commaCount = (line.match(/,/g) || []).length
          const isExplanatoryText = 
            line.includes('CSV above') || 
            line.includes('represents a selection') ||
            line.includes('extracted from') ||
            line.includes('according to') ||
            line.includes('specified format') ||
            line.includes('Here is') ||
            line.includes('Below is') ||
            line.includes('I have') ||
            line.includes('I will') ||
            line.includes('Please note') ||
            line.includes('Note:') ||
            line.includes('注意') ||
            (commaCount < 6 && line.length > 50)
          
          // Require at least 6 commas (7 fields minimum) for valid CSV row
          return commaCount >= 6 && !isExplanatoryText
        })
        
        // Add rows to collection
        allCsvRows.push(...dataLines)
        console.log(`Page ${pageIndex + 1} processed: ${dataLines.length} menu items`)
      } else {
        console.warn(`Page ${pageIndex + 1} processing failed: ${runStatus.status}`)
      }
    }
    
    // Combine all rows
    const finalCsv = header + '\n' + allCsvRows.join('\n')
    const finalRowCount = allCsvRows.length
    
    console.log(`All pages processed. Total: ${finalRowCount} menu items`)
    
    // Clean up resources
    for (const fileId of uploadedFiles) {
      await openai.files.delete(fileId).catch(() => {})
    }
    await openai.beta.assistants.delete(assistant.id).catch(() => {})
    
    return NextResponse.json({
      csv: finalCsv,
      rowCount: finalRowCount,
      warning: undefined,
    })
    
  } catch (error: any) {
    console.error('Page-by-page processing error:', error)
    
    // Clean up resources
    try {
      for (const fileId of uploadedFiles) {
        await openai.files.delete(fileId).catch(() => {})
      }
      if (assistant?.id) {
        await openai.beta.assistants.delete(assistant.id).catch(() => {})
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError)
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to process PDF page by page' },
      { status: 500 }
    )
  }
}
