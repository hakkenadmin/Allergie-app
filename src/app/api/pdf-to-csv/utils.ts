// Validation and utility functions for PDF to CSV conversion

export interface MenuItemJson {
  menu_name: string
  description?: string
  price?: string | number
  category?: string
  allergies_contains: number[]
  allergies_share: number[]
  note?: string
  is_published: boolean
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  rowCount: number
}

// Valid allergy IDs from commonAllergies.ts
const VALID_ALLERGY_IDS = new Set([
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28
])

/**
 * Validates CSV row format
 */
export function validateCsvRow(row: string, rowIndex: number): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  const columns = row.split(',')
  
  // Check column count (should be 8)
  if (columns.length < 7) {
    errors.push(`Row ${rowIndex}: Too few columns (${columns.length}, expected 8)`)
    return { isValid: false, errors }
  }
  
  // Check menu name is not empty
  const menuName = columns[0]?.trim().replace(/^"|"$/g, '')
  if (!menuName || menuName === '') {
    errors.push(`Row ${rowIndex}: Menu name is empty`)
  }
  
  // Validate allergy IDs
  const containsIds = parseAllergyIds(columns[4])
  const shareIds = parseAllergyIds(columns[5])
  
  for (const id of containsIds) {
    if (!VALID_ALLERGY_IDS.has(id)) {
      errors.push(`Row ${rowIndex}: Invalid allergy ID in contains: ${id}`)
    }
  }
  
  for (const id of shareIds) {
    if (!VALID_ALLERGY_IDS.has(id)) {
      errors.push(`Row ${rowIndex}: Invalid allergy ID in share: ${id}`)
    }
  }
  
  // Check for common errors
  if (menuName.includes('undefined') || menuName.includes('null')) {
    errors.push(`Row ${rowIndex}: Contains undefined/null in menu name`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Validates entire CSV content
 */
export function validateCsv(csvContent: string): ValidationResult {
  const lines = csvContent.split('\n').filter(line => line.trim())
  const errors: string[] = []
  const warnings: string[] = []
  
  if (lines.length === 0) {
    return {
      isValid: false,
      errors: ['CSV is empty'],
      warnings: [],
      rowCount: 0
    }
  }
  
  // Check header
  const header = lines[0]
  const expectedHeader = 'メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開'
  if (!header.includes('メニュー名')) {
    errors.push('Missing or incorrect CSV header')
  }
  
  // Validate data rows
  const dataRows = lines.slice(1)
  let validRows = 0
  
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]
    const validation = validateCsvRow(row, i + 2) // +2 because header is row 1, and we're 0-indexed
    
    if (validation.isValid) {
      validRows++
    } else {
      errors.push(...validation.errors)
    }
  }
  
  // Warnings
  if (validRows === 0 && dataRows.length > 0) {
    warnings.push('No valid data rows found')
  }
  
  if (validRows < dataRows.length) {
    warnings.push(`${dataRows.length - validRows} rows failed validation`)
  }
  
  return {
    isValid: errors.length === 0 && validRows > 0,
    errors,
    warnings,
    rowCount: validRows
  }
}

/**
 * Parses allergy ID string to array of numbers
 */
function parseAllergyIds(allergyString: string): number[] {
  if (!allergyString || allergyString.trim() === '' || allergyString === '""') {
    return []
  }
  
  // Remove quotes if present
  const cleaned = allergyString.trim().replace(/^"|"$/g, '')
  if (!cleaned) return []
  
  return cleaned
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !isNaN(id) && id > 0)
}

/**
 * Converts JSON array to CSV format
 */
export function jsonToCsv(items: MenuItemJson[]): string {
  const header = 'メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開'
  const rows = items.map(item => {
    const menuName = escapeCsvField(item.menu_name)
    const description = escapeCsvField(item.description || '')
    const price = escapeCsvField(item.price?.toString() || '')
    const category = escapeCsvField(item.category || '')
    const contains = item.allergies_contains.length > 0 
      ? `"${item.allergies_contains.join(',')}"` 
      : ''
    const share = item.allergies_share.length > 0 
      ? `"${item.allergies_share.join(',')}"` 
      : ''
    const note = escapeCsvField(item.note || '')
    const published = item.is_published ? 'true' : 'false'
    
    return `${menuName},${description},${price},${category},${contains},${share},${note},${published}`
  })
  
  return [header, ...rows].join('\n')
}

/**
 * Escapes CSV field (handles commas and quotes)
 */
function escapeCsvField(field: string): string {
  if (!field) return ''
  // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

/**
 * Filters out non-CSV content from AI response
 */
export function filterCsvContent(content: string): string {
  // Remove markdown code blocks
  let cleaned = content.replace(/```csv\n?/gi, '').replace(/```\n?/g, '').trim()
  
  // Remove explanatory text
  const explanatoryPhrases = [
    'CSV above',
    'represents a selection',
    'extracted from',
    'according to',
    'specified format',
    'Here is',
    'Below is',
    'I have',
    'I will',
    'Please note',
    'Note:',
    '注意',
    'This CSV',
    'The following',
    'As requested'
  ]
  
  const lines = cleaned.split('\n')
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim()
    if (!trimmed) return false
    
    // Skip if it's clearly explanatory text
    const isExplanatory = explanatoryPhrases.some(phrase => 
      trimmed.toLowerCase().includes(phrase.toLowerCase())
    )
    
    if (isExplanatory) return false
    
    // Require at least 6 commas for valid CSV row (7 fields minimum)
    const commaCount = (trimmed.match(/,/g) || []).length
    return commaCount >= 6
  })
  
  return filteredLines.join('\n')
}



