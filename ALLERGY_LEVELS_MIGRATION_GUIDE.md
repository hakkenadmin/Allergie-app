# Allergy Levels Migration Guide

## Overview
The system now supports 3 levels of allergy information:
- **● (black circle)** = `contains` - Item definitely contains this allergen
- **△ (triangle)** = `share` - Item shares same pipeline/equipment, may contain traces  
- **- (dash)** = `none` - Item does not contain this allergen

## Database Schema

The `menu_items` table now has separate columns:
- `allergies_contains DECIMAL[]` - Array of allergy IDs that contain allergen (●)
- `allergies_share DECIMAL[]` - Array of allergy IDs that share equipment (△)

## TypeScript Types

The `MenuItem` interface now uses:
```typescript
allergies_contains: number[]  // Array of allergy IDs that contain allergen
allergies_share: number[]      // Array of allergy IDs that share equipment
```

## CSV Format

### Format
```csv
メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開
サンプルメニュー,,,寿司,"1,3,5","2,4",,true
```

- **含有アレルギー**: Comma-separated allergy IDs for ● (contains)
- **共有アレルギー**: Comma-separated allergy IDs for △ (share)

## AI PDF Processing

The AI prompt now recognizes:
- ● (black/filled circle) → `contains` column
- ○ (white/empty circle) → `share` column
- - (dash) → Not included in output

The AI outputs CSV with two separate columns: `含有アレルギー,共有アレルギー`

## Matching Logic

Menu items are matched against user allergies if:
- Allergy ID is in `allergies_contains` OR `allergies_share`
- User selection is yes/no (users select allergies, not levels)

## UI Display

- **●** badge shown for `allergies_contains`
- **△** badge shown for `allergies_share`
- Both levels are matched against user allergies

## Components Updated

✅ `src/types/menu.types.ts` - Type definitions (separate columns)
✅ `src/lib/services/menuService.ts` - Data fetching and matching
✅ `src/components/MenuChecker.tsx` - Display with level badges (●/△)
✅ `src/components/admin/MenuTable.tsx` - Editing UI with separate sections
✅ `src/components/admin/CsvUploader.tsx` - CSV parsing (two columns)
✅ `src/app/api/pdf-to-csv/route.ts` - AI prompt updated

## Notes

- User allergies remain yes/no selection (users select allergies, not levels)
- Menu items store allergies in two separate columns
- Both `contains` and `share` levels are matched against user allergies
- The old `allergies` column has been removed from the database
