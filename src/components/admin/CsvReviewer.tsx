'use client'

import { useState } from 'react'
import type { Store } from '@/types/menu.types'
import CsvUploader from './CsvUploader'

interface CsvReviewerProps {
  store: Store
  csv: string
  validation?: {
    isValid: boolean
    errors: string[]
    warnings: string[]
  }
  onClose: () => void
  onUploadComplete: () => void
}

export default function CsvReviewer({ store, csv, validation, onClose, onUploadComplete }: CsvReviewerProps) {
  const [editableCsv, setEditableCsv] = useState(csv)
  const [showEditor, setShowEditor] = useState(false)

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

  const lines = editableCsv.split('\n').filter(line => line.trim())
  const headerColumns = lines.length > 0 ? parseCsvLine(lines[0]) : []
  const dataRows = lines.slice(1).map(line => parseCsvLine(line))

  const handleEdit = () => {
    setShowEditor(true)
  }

  const handleSaveEdit = () => {
    setShowEditor(false)
  }

  const [proceedToUpload, setProceedToUpload] = useState(false)

  const handleProceed = () => {
    setProceedToUpload(true)
  }

  if (proceedToUpload) {
    return (
      <CsvUploader
        store={store}
        onClose={onClose}
        onUploadComplete={onUploadComplete}
        initialCsvData={editableCsv}
      />
    )
  }

  if (showEditor) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">CSVを編集</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1 text-sm bg-logo-green text-white rounded hover:bg-green-600"
            >
              保存して続行
            </button>
            <button
              onClick={() => setShowEditor(false)}
              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              キャンセル
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CSVデータを編集してください:
          </label>
          <textarea
            value={editableCsv}
            onChange={(e) => setEditableCsv(e.target.value)}
            className="w-full h-96 p-3 border border-gray-300 rounded font-mono text-sm"
            spellCheck={false}
          />
        </div>

        <div className="text-xs text-gray-500">
          <p>• CSV形式を維持してください</p>
          <p>• ヘッダー行は変更しないでください</p>
          <p>• 各行は8つのカラム（メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開）である必要があります</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">CSVプレビューと確認</h2>
        <button
          onClick={onClose}
          className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          閉じる
        </button>
      </div>

      {/* Validation Warnings */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="mb-4 space-y-2">
          {validation.errors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm font-semibold text-red-800 mb-1">エラー ({validation.errors.length}件):</p>
              <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                {validation.errors.slice(0, 10).map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
                {validation.errors.length > 10 && (
                  <li>...他 {validation.errors.length - 10} 件のエラー</li>
                )}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-semibold text-yellow-800 mb-1">警告 ({validation.warnings.length}件):</p>
              <ul className="text-xs text-yellow-700 list-disc list-inside space-y-1">
                {validation.warnings.slice(0, 10).map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
                {validation.warnings.length > 10 && (
                  <li>...他 {validation.warnings.length - 10} 件の警告</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* CSV Preview Table */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">
            生成された行数: {dataRows.length}行
          </p>
          <button
            onClick={handleEdit}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            編集
          </button>
        </div>
        <div className="border border-gray-300 rounded overflow-x-auto max-h-96">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {headerColumns.map((col, idx) => (
                  <th key={idx} className="px-2 py-1 text-left border-b border-gray-200 font-semibold">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.slice(0, 50).map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-gray-100 hover:bg-gray-50">
                  {headerColumns.map((_, colIdx) => (
                    <td key={colIdx} className="px-2 py-1 text-gray-700">
                      {row[colIdx] ? (row[colIdx].length > 30 ? `${row[colIdx].substring(0, 30)}...` : row[colIdx]) : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {dataRows.length > 50 && (
            <div className="p-2 text-xs text-gray-500 text-center bg-gray-50">
              ...他 {dataRows.length - 50} 行（最初の50行のみ表示）
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleProceed}
          className="px-4 py-2 bg-logo-green text-white rounded hover:bg-green-600"
        >
          このCSVで続行
        </button>
        <button
          onClick={handleEdit}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          編集
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}

