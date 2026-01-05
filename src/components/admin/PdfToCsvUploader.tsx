'use client'

import { useState, useEffect } from 'react'
import type { Store } from '@/types/menu.types'
import CsvUploader from './CsvUploader'
import CsvReviewer from './CsvReviewer'

interface PdfToCsvUploaderProps {
  store: Store
  onClose: () => void
  onUploadComplete: () => void
}

export default function PdfToCsvUploader({ store, onClose, onUploadComplete }: PdfToCsvUploaderProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedCsv, setGeneratedCsv] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  // Debug: Log state changes
  useEffect(() => {
    console.log('PdfToCsvUploader state:', {
      hasPdfFile: !!pdfFile,
      processing,
      hasGeneratedCsv: !!generatedCsv,
      generatedCsvLength: generatedCsv?.length || 0,
      error
    })
  }, [pdfFile, processing, generatedCsv, error])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('PDFファイルを選択してください')
      return
    }

    setPdfFile(file)
    setError(null)
    setGeneratedCsv(null)
  }

  const handleProcessPdf = async () => {
    if (!pdfFile) return

    setProcessing(true)
    setError(null)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', pdfFile)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + 10
        })
      }, 1000)

      let response: Response
      try {
        // Add timeout to fetch request (5 minutes for large PDFs)
        const timeoutMs = 5 * 60 * 1000 // 5 minutes
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
        
        response = await fetch('/api/pdf-to-csv', {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
      } catch (fetchError: any) {
        clearInterval(progressInterval)
        setProgress(0)
        // Network error or fetch failed
        if (fetchError.name === 'AbortError') {
          throw new Error('タイムアウト: PDFの処理に時間がかかりすぎました。ファイルサイズを確認してください。')
        }
        if (fetchError.name === 'TypeError' || fetchError.message?.includes('fetch')) {
          throw new Error('ネットワークエラー: サーバーに接続できませんでした。インターネット接続を確認してください。')
        }
        throw new Error(fetchError.message || 'PDFのアップロードに失敗しました')
      }

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        let errorMessage = 'PDFの処理に失敗しました'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (textError) {
            errorMessage = `サーバーエラー (${response.status}): ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }

      let data: any
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('サーバーからの応答を解析できませんでした')
      }
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/97df777c-29ce-4f5f-9983-f0ddeca751ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PdfToCsvUploader.tsx:66',message:'API response received',data:{hasCsv:!!data.csv,csvLength:data.csv?.length,rowCount:data.rowCount,warning:data.warning,validation:data.validation},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      if (!data.csv) {
        throw new Error('CSVデータが生成されませんでした')
      }

      // Log row count for debugging
      const rowCount = data.rowCount || data.csv.split('\n').filter((line: string) => line.trim()).length - 1
      console.log(`PDF converted to CSV: ${rowCount} menu items`)
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/97df777c-29ce-4f5f-9983-f0ddeca751ea',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'PdfToCsvUploader.tsx:75',message:'CSV passed to reviewer',data:{rowCount,csvFirst500:data.csv.substring(0,500),csvLast500:data.csv.substring(Math.max(0,data.csv.length-500)),validationErrors:data.validation?.errors?.length,validationWarnings:data.validation?.warnings?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Store CSV with validation info for review
      const csvData = {
        csv: data.csv,
        validation: data.validation || { isValid: true, errors: [], warnings: [] }
      }
      console.log('Setting generatedCsv with data:', { 
        csvLength: csvData.csv.length, 
        hasValidation: !!csvData.validation,
        validationErrors: csvData.validation.errors?.length || 0
      })
      setGeneratedCsv(JSON.stringify(csvData))
      setProgress(0)
      // Note: setProcessing(false) is called in finally block
    } catch (err: any) {
      console.error('PDF processing error:', err)
      let errorMessage = 'PDFの処理に失敗しました'
      
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.message) {
        errorMessage = err.message
      }
      
      // Handle specific error types
      if (errorMessage.includes('fetch') || errorMessage.includes('ネットワーク')) {
        errorMessage = 'ネットワークエラー: サーバーに接続できませんでした。インターネット接続を確認してください。'
      } else if (errorMessage.includes('timeout') || errorMessage.includes('タイムアウト')) {
        errorMessage = 'タイムアウト: PDFの処理に時間がかかりすぎました。ファイルサイズを確認してください。'
      } else if (errorMessage.includes('API key') || errorMessage.includes('OpenAI')) {
        errorMessage = 'API設定エラー: OpenAI APIキーが設定されていない可能性があります。'
      }
      
      setError(errorMessage)
      setProgress(0)
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirm = () => {
    // CSV data will be passed to CsvUploader via initialCsvData prop
    // The CsvUploader component will handle the rest
  }

  const handleReset = () => {
    setPdfFile(null)
    setGeneratedCsv(null)
    setError(null)
    setProgress(0)
  }

  // If CSV is generated, show it in CsvReviewer first, then CsvUploader
  if (generatedCsv) {
    console.log('generatedCsv exists, length:', generatedCsv.length)
    try {
      const parsed = JSON.parse(generatedCsv)
      console.log('Parsed generatedCsv:', { hasCsv: !!parsed.csv, hasValidation: !!parsed.validation })
      
      if (parsed.csv) {
        // Show reviewer component with validation info if available
        return (
          <CsvReviewer
            store={store}
            csv={parsed.csv}
            validation={parsed.validation || { isValid: true, errors: [], warnings: [] }}
            onClose={() => {
              console.log('CsvReviewer onClose called')
              // Reset state when closing from reviewer
              setGeneratedCsv(null)
              setPdfFile(null)
              onClose()
            }}
            onUploadComplete={onUploadComplete}
          />
        )
      } else {
        console.warn('parsed.csv is missing, parsed:', parsed)
      }
    } catch (e) {
      // Fallback to old format (direct CSV string) - show CsvUploader directly
      console.log('Parsing generatedCsv failed, treating as direct CSV string:', e)
      return (
        <CsvUploader
          store={store}
          onClose={onClose}
          onUploadComplete={onUploadComplete}
          initialCsvData={generatedCsv}
        />
      )
    }
    // If we get here, something went wrong but we still have generatedCsv
    // Show CsvUploader as fallback
    console.warn('Unexpected state: generatedCsv exists but parsing failed, showing CsvUploader')
    return (
      <CsvUploader
        store={store}
        onClose={onClose}
        onUploadComplete={onUploadComplete}
        initialCsvData={generatedCsv}
      />
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">PDFからCSVへ変換</h2>
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          disabled={processing}
        >
          閉じる
        </button>
      </div>

      <div className="space-y-4">
        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PDFファイルを選択
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            disabled={processing}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-logo-orange file:text-white hover:file:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Selected File Info */}
        {pdfFile && (
          <div className="p-3 bg-gray-50 rounded">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-700">{pdfFile.name}</span>
                <span className="text-xs text-gray-500">
                  ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              {!processing && (
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  削除
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Progress Bar */}
        {processing && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">AIがPDFを処理中...</span>
              <span className="text-sm font-medium text-gray-900">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-logo-orange h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              この処理には数秒から数分かかる場合があります。ページを閉じないでください。
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded text-xs text-gray-600">
          <p className="font-semibold mb-1 text-blue-900">PDFからCSVへの変換について:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>AIがPDFを読み取り、メニュー情報を自動抽出します</li>
            <li>生成されたCSVはプレビューで確認できます</li>
            <li>確認後、既存のCSVインポーターで保存できます</li>
            <li>処理には数秒から数分かかる場合があります</li>
          </ul>
        </div>

        {/* Process Button */}
        <div className="flex gap-3">
          <button
            onClick={handleProcessPdf}
            disabled={!pdfFile || processing}
            className="px-4 py-2 bg-logo-orange text-white rounded hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {processing ? '処理中...' : 'PDFを処理してCSVを生成'}
          </button>
          {pdfFile && !processing && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              リセット
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

