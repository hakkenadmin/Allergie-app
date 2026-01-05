'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

interface StoreCsvUploaderProps {
  onClose: () => void
  onUploadComplete: () => void
}

interface CsvRow {
  [key: string]: string
}

interface ColumnMapping {
  store_name?: string
  description?: string
  managing_company?: string
  address?: string
  phone?: string
  website?: string
  verified?: string
}

export default function StoreCsvUploader({ onClose, onUploadComplete }: StoreCsvUploaderProps) {
  const [csvData, setCsvData] = useState<CsvRow[]>([])
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({})
  const [isMapping, setIsMapping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadErrors, setUploadErrors] = useState<string[]>([])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Reset state
    setCsvData([])
    setCsvHeaders([])
    setColumnMapping({})
    setUploadErrors([])
    setIsMapping(false)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCsv(text)
    }
    reader.onerror = () => {
      alert('ファイルの読み込みに失敗しました')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const parseCsv = (csvText: string) => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim())
      if (lines.length === 0) {
        alert('CSVファイルが空です')
        return
      }

      // Parse headers - handle quoted strings and commas
      const headers = parseCsvLine(lines[0])
      setCsvHeaders(headers)

      // Parse rows
      const rows: CsvRow[] = []
      for (let i = 1; i < lines.length; i++) {
        const values = parseCsvLine(lines[i])
        const row: CsvRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        // Only add non-empty rows
        if (Object.values(row).some(val => val.trim())) {
          rows.push(row)
        }
      }

      if (rows.length === 0) {
        alert('データ行が見つかりませんでした')
        return
      }

      setCsvData(rows)
      setIsMapping(true)
    } catch (error) {
      console.error('CSV parsing error:', error)
      alert('CSVファイルの解析に失敗しました')
    }
  }

  // Parse CSV line handling quoted strings and commas
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          // Toggle quote state
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    // Add last field
    result.push(current.trim())
    return result
  }

  const handleMappingChange = (dbField: keyof ColumnMapping, csvColumn: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [dbField]: csvColumn
    }))
  }

  const handleUpload = async () => {
    if (!columnMapping.store_name) {
      alert('店舗名の列を選択してください')
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadErrors([])

    try {
      const storesToInsert = csvData
        .map((row, index) => {
          const storeName = row[columnMapping.store_name!]?.trim() || ''
          if (!storeName) {
            setUploadErrors(prev => [...prev, `行 ${index + 2}: 店舗名が空です`])
            return null
          }

          const verified = columnMapping.verified 
            ? (row[columnMapping.verified]?.toLowerCase().trim() === 'y' || 
               row[columnMapping.verified]?.toLowerCase().trim() === 'yes' ||
               row[columnMapping.verified]?.toLowerCase().trim() === 'true' ||
               row[columnMapping.verified]?.trim() === '1' ? 'y' : 'n')
            : 'n'

          const store: any = {
            store_name: storeName,
            description: columnMapping.description ? (row[columnMapping.description]?.trim() || null) : null,
            managing_company: columnMapping.managing_company ? (row[columnMapping.managing_company]?.trim() || null) : null,
            address: columnMapping.address ? (row[columnMapping.address]?.trim() || null) : null,
            phone: columnMapping.phone ? (row[columnMapping.phone]?.trim() || null) : null,
            website: columnMapping.website ? (row[columnMapping.website]?.trim() || null) : null,
            verified: verified,
          }

          return store
        })
        .filter(store => store !== null)

      if (storesToInsert.length === 0) {
        alert('有効なデータがありません')
        setUploading(false)
        return
      }

      // Insert stores in batches
      const batchSize = 10
      let inserted = 0
      const errors: string[] = []

      for (let i = 0; i < storesToInsert.length; i += batchSize) {
        const batch = storesToInsert.slice(i, i + batchSize)
        const { error } = await supabase
          .from('stores')
          .insert(batch)

        if (error) {
          console.error('Error inserting batch:', error)
          errors.push(`バッチ ${Math.floor(i / batchSize) + 1}: ${error.message}`)
          // Continue with next batch instead of stopping
        } else {
          inserted += batch.length
        }

        setUploadProgress(Math.round(((i + batch.length) / storesToInsert.length) * 100))
      }

      // Show results
      if (errors.length > 0) {
        setUploadErrors(errors)
        alert(`${inserted}件の店舗を追加しました。${errors.length}件のエラーが発生しました。`)
      } else {
        alert(`${inserted}件の店舗を追加しました`)
        onUploadComplete()
        onClose()
      }
    } catch (err: any) {
      console.error('Error uploading CSV:', err)
      alert(`アップロードに失敗しました: ${err?.message || 'Unknown error'}`)
    } finally {
      setUploading(false)
      if (uploadErrors.length === 0) {
        setUploadProgress(0)
      }
    }
  }

  const databaseFields = [
    { key: 'store_name', label: '店舗名', required: true },
    { key: 'description', label: '説明', required: false },
    { key: 'managing_company', label: '運営会社', required: false },
    { key: 'address', label: '住所', required: false },
    { key: 'phone', label: '電話番号', required: false },
    { key: 'website', label: 'ウェブサイト', required: false },
    { key: 'verified', label: '認証済み (y/n)', required: false },
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">店舗情報CSVアップロード</h2>
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          disabled={uploading}
        >
          閉じる
        </button>
      </div>

      {!isMapping ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CSVファイルを選択
          </label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-logo-orange file:text-white hover:file:bg-orange-600"
          />
          <div className="mt-3 p-3 bg-gray-50 rounded text-xs text-gray-600">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">CSV形式の要件:</p>
              <a
                href="/sample_stores.csv"
                download="sample_stores.csv"
                className="px-3 py-1 text-xs bg-logo-blue text-white rounded hover:bg-blue-600 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                サンプルCSVをダウンロード
              </a>
            </div>
            <ul className="list-disc list-inside space-y-1">
              <li>1行目はヘッダーとして扱われます</li>
              <li>店舗名は必須です</li>
              <li>認証済み列は y/n または yes/no または true/false または 1/0</li>
              <li>複数の店舗を一度に登録できます</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              列のマッピング ({csvData.length}件のデータ)
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              CSVの各列をデータベースのフィールドにマッピングしてください
            </p>

            <div className="space-y-3">
              {databaseFields.map((field) => (
                <div key={field.key} className="flex items-center gap-4">
                  <label className="w-40 text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <select
                    value={columnMapping[field.key as keyof ColumnMapping] || ''}
                    onChange={(e) => handleMappingChange(field.key as keyof ColumnMapping, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-logo-orange"
                    disabled={uploading}
                  >
                    <option value="">-- 選択しない --</option>
                    {csvHeaders.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Preview */}
            {csvData.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">プレビュー (最初の3行)</h4>
                <div className="overflow-x-auto border border-gray-200 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {csvHeaders.map((header) => (
                          <th key={header} className="px-2 py-1 text-left border-b">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 3).map((row, idx) => (
                        <tr key={idx}>
                          {csvHeaders.map((header) => (
                            <td key={header} className="px-2 py-1 border-b max-w-xs truncate">
                              {row[header] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Upload Errors */}
            {uploadErrors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <h4 className="text-sm font-semibold text-red-900 mb-2">エラー:</h4>
                <ul className="text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                  {uploadErrors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Upload Progress */}
            {uploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">アップロード中...</span>
                  <span className="text-sm font-medium text-gray-900">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-logo-green h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setIsMapping(false)
                  setCsvData([])
                  setCsvHeaders([])
                  setColumnMapping({})
                  setUploadErrors([])
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                disabled={uploading}
              >
                別のファイルを選択
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !columnMapping.store_name}
                className="px-4 py-2 bg-logo-green text-white rounded hover:bg-green-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {uploading ? 'アップロード中...' : '店舗を一括登録'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


