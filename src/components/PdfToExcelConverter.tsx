'use client'

import { useState } from 'react'

interface PdfToExcelConverterProps {
  onExcelConverted?: (excelFile: File) => void
}

export default function PdfToExcelConverter({ onExcelConverted }: PdfToExcelConverterProps) {
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [convertedExcelFile, setConvertedExcelFile] = useState<File | null>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file')
      return
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      setError('File size exceeds 100MB limit')
      return
    }

    setPdfFile(file)
    setError(null)
  }

  const handleConvert = async () => {
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

      // Add timeout to fetch request (5 minutes for large PDFs)
      const timeoutMs = 5 * 60 * 1000 // 5 minutes
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch('/api/pdf-to-excel', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        let errorMessage = 'PDF conversion failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (textError) {
            errorMessage = `Server error (${response.status}): ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }

      // Get the Excel file blob
      const blob = await response.blob()

      // Create File object from blob for passing to Excel to CSV converter
      const excelFileName = pdfFile.name.replace(/\.pdf$/i, '.xlsx')
      const excelFile = new File([blob], excelFileName, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      setConvertedExcelFile(excelFile)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = excelFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      // Notify parent component about the converted Excel file
      if (onExcelConverted) {
        onExcelConverted(excelFile)
      }

      // Reset form
      setPdfFile(null)
      setProgress(0)
    } catch (err: any) {
      console.error('PDF conversion error:', err)
      let errorMessage = 'PDF conversion failed'

      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.message) {
        errorMessage = err.message
      }

      // Handle specific error types
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        errorMessage =
          'Network error: Could not connect to server. Please check your internet connection.'
      } else if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('timed out')
      ) {
        errorMessage =
          'Timeout: PDF conversion took too long. Please check the file size and try again.'
      } else if (
        errorMessage.includes('API') ||
        errorMessage.includes('credentials')
      ) {
        errorMessage =
          'API configuration error: Adobe PDF Services API credentials may not be configured.'
      }

      setError(errorMessage)
      setProgress(0)
    } finally {
      setProcessing(false)
    }
  }

  const handleReset = () => {
    setPdfFile(null)
    setError(null)
    setProgress(0)
    setConvertedExcelFile(null)
  }

  return (
    <div className="space-y-4">
        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select PDF File
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
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
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
                  Remove
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Progress Bar */}
        {processing && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">
                Converting PDF to Excel...
              </span>
              <span className="text-sm font-medium text-gray-900">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300 bg-logo-orange"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This process may take several seconds to a few minutes. Please do
              not close this page.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 bg-blue-50 rounded text-xs text-gray-600">
          <p className="font-semibold mb-1 text-blue-900">
            About PDF to Excel Conversion:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Maximum file size: 100MB</li>
            <li>Supported format: PDF files only</li>
            <li>The converted Excel file will be downloaded automatically</li>
            <li>Tables and structured data are preserved in the conversion</li>
          </ul>
        </div>

        {/* Success Message with Convert to CSV Button */}
        {convertedExcelFile && !processing && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium text-green-800">
                  Excel file converted successfully!
                </span>
              </div>
            </div>
            <p className="text-xs text-green-700 mb-3">
              File downloaded: {convertedExcelFile.name}
            </p>
            {onExcelConverted && (
              <button
                onClick={() => onExcelConverted(convertedExcelFile)}
                className="w-full px-4 py-2 bg-logo-green text-white rounded hover:bg-green-600 transition-colors font-medium text-sm"
              >
                Convert this Excel to CSV →
              </button>
            )}
          </div>
        )}

        {/* Convert Button */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleConvert}
            disabled={!pdfFile || processing}
            className="flex-1 min-w-[200px] px-4 py-2 bg-logo-orange text-white rounded hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {processing ? 'Converting...' : 'Convert to Excel'}
          </button>
          {pdfFile && !processing && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
  )
}
