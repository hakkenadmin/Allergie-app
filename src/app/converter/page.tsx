'use client'

import { useState } from 'react'
import PdfToExcelConverter from '@/components/PdfToExcelConverter'
import ExcelToCsvConverter from '@/components/ExcelToCsvConverter'

export default function ConverterPage() {
  const [excelFileForCsv, setExcelFileForCsv] = useState<File | null>(null)

  const handleExcelConverted = (excelFile: File) => {
    setExcelFileForCsv(excelFile)
    // Scroll to Excel to CSV section
    setTimeout(() => {
      const csvSection = document.getElementById('excel-to-csv-section')
      if (csvSection) {
        csvSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          File Converters
        </h1>
        <p className="text-gray-600">
          Convert between PDF, Excel, and CSV formats for menu items
        </p>
      </div>

      <div className="space-y-8">
        {/* PDF to Excel Section */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              PDF to Excel Converter
            </h2>
            <p className="text-sm text-gray-600">
              Convert PDF files to Excel format using Adobe PDF Services API
            </p>
          </div>
          <PdfToExcelConverter onExcelConverted={handleExcelConverted} />
        </section>

        {/* Excel to CSV Section */}
        <section
          id="excel-to-csv-section"
          className="bg-white rounded-lg shadow-md p-6"
        >
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-1">
              Excel to CSV Converter
            </h2>
            <p className="text-sm text-gray-600">
              Convert Excel files to CSV format for menu items upload
            </p>
          </div>
          <ExcelToCsvConverter initialFile={excelFileForCsv} />
        </section>
      </div>
    </div>
  )
}
