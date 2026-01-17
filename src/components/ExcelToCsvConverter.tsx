'use client'

import { useState, useEffect } from 'react'

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface ExcelToCsvConverterProps {
  initialFile?: File | null
}

export default function ExcelToCsvConverter({ initialFile }: ExcelToCsvConverterProps = {}) {
  const [excelFile, setExcelFile] = useState<File | null>(initialFile || null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [csvContent, setCsvContent] = useState<string | null>(null)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [rowCount, setRowCount] = useState(0)
  const [showPreview, setShowPreview] = useState(false)

  // Separate convert function that accepts a file parameter
  const handleConvertWithFile = async (file: File) => {
    if (!file) return

    setProcessing(true)
    setError(null)
    setProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + 10
        })
      }, 500)

      const timeoutMs = 2 * 60 * 1000 // 2 minutes
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const response = await fetch('/api/excel-to-csv', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        let errorMessage = 'Excel conversion failed'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          try {
            const errorText = await response.text()
            errorMessage = errorText || errorMessage
          } catch (textError) {
            errorMessage = `Server error (${response.status}): ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()

      if (!data.csv) {
        throw new Error('CSV data was not generated')
      }

      setCsvContent(data.csv)
      setRowCount(data.rowCount || 0)
      setValidation(data.validation || {
        isValid: true,
        errors: [],
        warnings: [],
      })
      setShowPreview(true)
      setProgress(0)
    } catch (err: any) {
      console.error('Excel conversion error:', err)
      let errorMessage = 'Excel conversion failed'

      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err?.message) {
        errorMessage = err.message
      }

      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        errorMessage =
          'Network error: Could not connect to server. Please check your internet connection.'
      } else if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('timed out')
      ) {
        errorMessage =
          'Timeout: Excel conversion took too long. Please check the file size and try again.'
      }

      setError(errorMessage)
      setProgress(0)
    } finally {
      setProcessing(false)
    }
  }

  // Handle initial file from parent component and auto-convert
  useEffect(() => {
    if (initialFile && initialFile !== excelFile) {
      setExcelFile(initialFile)
      setError(null)
      setCsvContent(null)
      setValidation(null)
      setShowPreview(false)
      // Auto-convert when file is passed from PDF converter
      setTimeout(() => {
        handleConvertWithFile(initialFile)
      }, 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.xls') &&
      file.type !==
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      setError('Please select an Excel file (.xlsx or .xls)')
      return
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      setError('File size exceeds 50MB limit')
      return
    }

    setExcelFile(file)
    setError(null)
    setCsvContent(null)
    setValidation(null)
    setShowPreview(false)
  }

  const handleConvert = async () => {
    if (!excelFile) return
    await handleConvertWithFile(excelFile)
  }

  const handleDownload = () => {
    if (!csvContent) return

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = excelFile?.name.replace(/\.(xlsx|xls)$/i, '.csv') || 'converted.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setExcelFile(null)
    setCsvContent(null)
    setValidation(null)
    setError(null)
    setProgress(0)
    setShowPreview(false)
    setRowCount(0)
  }

  // Parse CSV for preview
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    result.push(current.trim())
    return result
  }

  const previewRows = csvContent
    ? csvContent
        .split('\n')
        .filter((line) => line.trim())
        .slice(0, 21)
        .map((line) => parseCsvLine(line))
    : []

  return (
    <>
      {!showPreview ? (
        <div className="space-y-4">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Excel File
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={processing}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-logo-orange file:text-white hover:file:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Selected File Info */}
          {excelFile && (
            <div className="p-3 bg-gray-50 rounded">
              <div className="flex items-center justify-between">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-sm text-gray-700">{excelFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(excelFile.size / 1024 / 1024).toFixed(2)} MB)
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
                  Converting Excel to CSV...
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
                This process may take several seconds. Please do not close this
                page.
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="p-3 bg-blue-50 rounded text-xs text-gray-600">
            <p className="font-semibold mb-1 text-blue-900">
              About Excel to CSV Conversion:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Maximum file size: 50MB</li>
              <li>Supported formats: .xlsx, .xls</li>
              <li>First sheet will be processed</li>
              <li>CSV will be validated before download</li>
              <li>Allergy names will be converted to IDs automatically</li>
            </ul>
          </div>

          {/* Convert Button */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleConvert}
              disabled={!excelFile || processing}
              className="flex-1 min-w-[200px] px-4 py-2 bg-logo-orange text-white rounded hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {processing ? 'Converting...' : 'Convert to CSV'}
            </button>
            {excelFile && !processing && (
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Validation Results */}
          {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-2">
              {validation.errors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-semibold text-red-800 mb-1">
                    Errors ({validation.errors.length}):
                  </p>
                  <ul className="text-xs text-red-700 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                    {validation.errors.slice(0, 10).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {validation.errors.length > 10 && (
                      <li>...and {validation.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">
                    Warnings ({validation.warnings.length}):
                  </p>
                  <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                    {validation.warnings.slice(0, 10).map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                    {validation.warnings.length > 10 && (
                      <li>...and {validation.warnings.length - 10} more warnings</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* CSV Preview */}
          {previewRows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">
                  Generated rows: {rowCount} rows
                </p>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hide Preview
                </button>
              </div>
              <div className="border border-gray-300 rounded overflow-x-auto max-h-96">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {previewRows[0]?.map((col, idx) => (
                        <th
                          key={idx}
                          className="px-2 py-1 text-left border-b border-gray-200 font-semibold"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(1, 21).map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        {previewRows[0]?.map((_, colIdx) => (
                          <td
                            key={colIdx}
                            className="px-2 py-1 text-gray-700"
                          >
                            {row[colIdx]
                              ? row[colIdx].length > 30
                                ? `${row[colIdx].substring(0, 30)}...`
                                : row[colIdx]
                              : ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rowCount > 20 && (
                  <div className="p-2 text-xs text-gray-500 text-center bg-gray-50">
                    ...and {rowCount - 20} more rows (showing first 20 rows)
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-logo-green text-white rounded hover:bg-green-600 transition-colors font-medium"
            >
              Download CSV
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Convert Another File
            </button>
          </div>
        </div>
      )}
    </>
  )
}
