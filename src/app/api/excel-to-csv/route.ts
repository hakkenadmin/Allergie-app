import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { validateCsv } from '../pdf-to-csv/utils'
import { COMMON_ALLERGIES } from '@/data/commonAllergies'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (
      !file.name.endsWith('.xlsx') &&
      !file.name.endsWith('.xls') &&
      file.type !==
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      return NextResponse.json(
        { error: 'File must be an Excel file (.xlsx or .xls)' },
        { status: 400 }
      )
    }

    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    const fileBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json(
        { error: 'Excel file contains no sheets' },
        { status: 400 }
      )
    }

    const worksheet = workbook.Sheets[sheetName]

    // ★重要：テーブル型Excelに強い「2次元配列」取得
    const rows2d = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: '',
    }) as any[][]

    if (!Array.isArray(rows2d) || rows2d.length === 0) {
      return NextResponse.json(
        { error: 'Excel file contains no data' },
        { status: 400 }
      )
    }

    const csvRows = convertToCsvFormat(rows2d)
    const csvContent = csvRows.join('\n')

    const validation = validateCsv(csvContent)

    return NextResponse.json({
      csv: csvContent,
      rowCount: csvRows.length - 1,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
      },
      sheetNames: workbook.SheetNames,
      selectedSheet: sheetName,
    })
  } catch (error: any) {
    console.error('Excel to CSV conversion error:', error)
    return NextResponse.json(
      {
        error:
          error.message ||
          'Failed to convert Excel to CSV. Please check the file and try again.',
      },
      { status: 500 }
    )
  }
}

/**
 * ✅ テーブル型アレルゲン表（注意書き→ヘッダ行→データ行）を正しくCSVに変換
 * rows2d: sheet_to_json({header:1}) の2次元配列
 */
function convertToCsvFormat(rows2d: any[][]): string[] {
  const header =
    'メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開'
  const out: string[] = [header]

  // ja→id
  const allergyNameToId = new Map<string, number>()
  COMMON_ALLERGIES.forEach((a) => allergyNameToId.set(a.ja, a.id))

  // Walnut は COMMON_ALLERGIES に無い想定でも拾えるようにする（IDが無ければ "くるみ" を出す）
  const WALNUT_JA = 'くるみ'

  // 文字正規化（改行・空白・全角スペース・タブなど除去）
  const norm = (v: any) =>
    String(v ?? '')
      .replace(/\s+/g, '')
      .replace(/　/g, '')
      .trim()

  // ヘッダ行を探す（「メニュー名称」が含まれる行）
  const headerRowIndex = rows2d.findIndex((r) =>
    r.some((cell) => norm(cell) === 'メニュー名称' || norm(cell) === 'メニュー名')
  )
  if (headerRowIndex === -1) {
    // テーブル形式じゃない場合は、従来形式にフォールバックしたいならここで別処理を入れる
    // 今回は明示的にエラーにする（実データはテーブルなのでここに来ない想定）
    throw new Error('ヘッダ行（メニュー名称）が見つかりません。')
  }

  const headerRow = rows2d[headerRowIndex].map((c) => norm(c))
  const colIndex = new Map<string, number>()
  headerRow.forEach((name, idx) => {
    if (name) colIndex.set(name, idx)
  })

  // 必須列
  const idxKubun = colIndex.get('区分')
  const idxMenu = colIndex.get('メニュー名称') ?? colIndex.get('メニュー名')
  if (idxMenu === undefined) throw new Error('メニュー名称列が見つかりません。')

  // Excelヘッダの揺れ対応（乳成分→乳、など）
  const allergenHeaderAliases: Record<string, string[]> = {
    '卵': ['卵'],
    '乳': ['乳', '乳成分'],
    '小麦': ['小麦'],
    'えび': ['えび'],
    'かに': ['かに'],
    'そば': ['そば'],
    '落花生': ['落花生'],
    'くるみ': ['くるみ'],
    'アーモンド': ['アーモンド', 'アーモンド', 'アーモンド'], // 改行は norm で消えるのでOK
    'あわび': ['あわび'],
    'いか': ['いか'],
    'いくら': ['いくら'],
    'オレンジ': ['オレンジ'],
    'カシューナッツ': ['カシューナッツ'],
    'キウイフルーツ': ['キウイフルーツ'],
    '牛肉': ['牛肉'],
    'ごま': ['ごま'],
    'さけ': ['さけ'],
    'さば': ['さば'],
    '大豆': ['大豆'],
    '鶏肉': ['鶏肉'],
    'バナナ': ['バナナ'],
    '豚肉': ['豚肉'],
    'もも': ['もも'],
    'やまいも': ['やまいも'],
    'りんご': ['りんご'],
    'ゼラチン': ['ゼラチン'],
  }

  // 日本語アレルゲン名→列index
  const allergenCol = new Map<string, number>()
  for (const [ja, aliases] of Object.entries(allergenHeaderAliases)) {
    for (const a of aliases) {
      const idx = colIndex.get(norm(a))
      if (idx !== undefined) {
        allergenCol.set(ja, idx)
        break
      }
    }
  }

  // データ行を処理（ヘッダ行の次から）
  for (let r = headerRowIndex + 1; r < rows2d.length; r++) {
    const row = rows2d[r] ?? []
    const menuName = norm(row[idxMenu])
    if (!menuName) continue

    const category = idxKubun !== undefined ? norm(row[idxKubun]) : ''

    const containsIds: string[] = []
    const sharesIds: string[] = []

    // ●=contains, ○=shares
    for (const [ja, idx] of allergenCol.entries()) {
      const cell = norm(row[idx])
      if (!cell) continue

      if (cell.includes('●')) {
        const id = allergyNameToId.get(ja)
        containsIds.push(id ? String(id) : ja)
      } else if (cell.includes('○')) {
        const id = allergyNameToId.get(ja)
        sharesIds.push(id ? String(id) : ja)
      } else {
        // ×, ― などが将来来ても無視（=含有/共有に入れない）
      }
    }

    // Walnut が COMMON_ALLERGIES に無い場合でも「くるみ」として拾う（列がある時だけ）
    if (allergenCol.has(WALNUT_JA)) {
      const idx = allergenCol.get(WALNUT_JA)!
      const cell = norm(row[idx])
      if (cell.includes('●')) {
        const id = allergyNameToId.get(WALNUT_JA)
        if (!containsIds.includes(id ? String(id) : WALNUT_JA)) {
          containsIds.push(id ? String(id) : WALNUT_JA)
        }
      } else if (cell.includes('○')) {
        const id = allergyNameToId.get(WALNUT_JA)
        if (!sharesIds.includes(id ? String(id) : WALNUT_JA)) {
          sharesIds.push(id ? String(id) : WALNUT_JA)
        }
      }
    }

    const csvRow = [
      escapeCsvField(menuName), // メニュー名
      '', // 説明（このExcelには無い）
      '', // 価格（このExcelには無い）
      escapeCsvField(category), // カテゴリ
      containsIds.length ? `"${containsIds.join(',')}"` : '',
      sharesIds.length ? `"${sharesIds.join(',')}"` : '',
      '', // 備考
      'true', // 公開（デフォルトtrue）
    ]

    out.push(csvRow.join(','))
  }

  return out
}

function escapeCsvField(field: string): string {
  if (!field) return ''
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}
