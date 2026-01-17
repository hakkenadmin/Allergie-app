#!/usr/bin/env python3
"""
PDF table extraction using Spire.PDF
Extracts tables from PDF and converts to CSV format
"""

from spire.pdf import PdfDocument, PdfTableExtractor
import csv
import sys
import json
import os
from pathlib import Path

def extract_tables_from_pdf(pdf_path: str, page_number: int = None):
    """
    Extract tables from PDF using Spire.PDF
    
    Args:
        pdf_path: Path to PDF file
        page_number: Specific page to extract (1-indexed), None for all pages
    
    Returns:
        List of tables, one per table found
    """
    tables = []
    
    try:
        # Create PdfDocument instance
        pdf = PdfDocument()
        
        # Load PDF document
        pdf.LoadFromFile(pdf_path)
        
        # Create PdfTableExtractor instance
        extractor = PdfTableExtractor(pdf)
        
        # Determine pages to process
        if page_number is not None:
            pages_to_process = [page_number - 1]  # Convert to 0-indexed
        else:
            pages_to_process = range(pdf.Pages.Count)
        
        # Iterate through pages
        for i in pages_to_process:
            if i >= pdf.Pages.Count:
                continue
                
            # Extract tables from current page
            page_tables = extractor.ExtractTable(i)
            
            # Process each table
            for j in range(len(page_tables)):
                table = page_tables[j]
                table_data = []
                
                # Get row and column count
                row_count = table.GetRowCount()
                col_count = table.GetColumnCount()
                
                # Iterate through rows and columns
                for row in range(row_count):
                    row_data = []
                    for col in range(col_count):
                        # Get cell text
                        text = table.GetText(row, col)
                        # Clean up text (remove newlines)
                        text = text.replace("\n", "").replace("\r", "") if text else ""
                        row_data.append(text)
                    table_data.append(row_data)
                
                if table_data and len(table_data) > 0:
                    tables.append({
                        'page': i + 1,
                        'table_index': j,
                        'data': table_data
                    })
        
        # Dispose resources
        pdf.Dispose()
        
    except Exception as e:
        return {'error': str(e)}
    
    return tables

def convert_to_menu_csv(tables, output_format='csv_string'):
    """
    Convert extracted tables to menu CSV format
    
    Expected CSV format:
    メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開
    """
    csv_header = 'メニュー名,説明,価格,カテゴリ,含有アレルギー,共有アレルギー,備考,公開'
    csv_rows = []
    
    # Common allergy names in Japanese
    allergy_keywords = [
        'えび', 'かに', '小麦', 'そば', '卵', '乳', '落花生', 'アーモンド',
        'あわび', 'いか', 'いくら', 'オレンジ', 'キウイフルーツ', '牛肉', 'ごま', 'さけ',
        'さば', '大豆', '鶏肉', 'バナナ', '豚肉', 'まつたけ', 'もも', 'やまいも',
        'りんご', 'ゼラチン'
    ]
    
    # Symbols for allergies
    contains_symbols = ['●', '・', '●']
    share_symbols = ['○', '▲']
    
    section_count = 0
    
    for table_info in tables:
        table_data = table_info['data']
        
        if not table_data or len(table_data) == 0:
            continue
        
        # Add separator if not first section
        if section_count > 0:
            csv_rows.append('')
            csv_rows.append(f'"--- 新しいテーブル (セクション {section_count + 1}) ---",,,,,,,')
            csv_rows.append(csv_header)
        elif section_count == 0:
            csv_rows.append(csv_header)
        
        section_count += 1
        
        # Find header row (usually contains allergy names)
        header_row_idx = None
        header_allergies = []
        
        for idx, row in enumerate(table_data):
            row_text = ' '.join([str(val) for val in row if val])
            if any(keyword in row_text for keyword in allergy_keywords):
                header_row_idx = idx
                # Extract allergy names from header
                for col_idx, cell_text in enumerate(row):
                    cell_text_str = str(cell_text) if cell_text else ''
                    for keyword in allergy_keywords:
                        if keyword in cell_text_str:
                            header_allergies.append(keyword)
                            break
                break
        
        # Process data rows
        start_idx = header_row_idx + 1 if header_row_idx is not None else 0
        
        for idx in range(start_idx, len(table_data)):
            row = table_data[idx]
            row_values = [str(val) if val else '' for val in row]
            
            # Skip empty rows
            if not any(val.strip() for val in row_values):
                continue
            
            # Skip header-like rows
            if any(keyword in ' '.join(row_values) for keyword in allergy_keywords[:5]):
                continue
            
            # Extract menu name (usually first column)
            menu_name = row_values[0].strip() if len(row_values) > 0 else ''
            if not menu_name or len(menu_name) < 1:
                continue
            
            # Extract description (usually second column)
            description = row_values[1].strip() if len(row_values) > 1 else ''
            
            # Extract price (usually third column or find number)
            price = ''
            for val in row_values[2:5]:
                if val and any(char.isdigit() for char in val):
                    price = val.strip()
                    break
            
            category = ''
            
            # Extract allergies
            contains_allergies = []
            share_allergies = []
            
            # Check each column for allergy symbols
            for col_idx, cell_text in enumerate(row_values):
                if not cell_text:
                    continue
                
                # Check for contains symbol (●)
                if any(symbol in cell_text for symbol in contains_symbols):
                    # Try to find allergy name
                    allergy_name = None
                    if col_idx < len(header_allergies):
                        allergy_name = header_allergies[col_idx]
                    else:
                        # Search nearby cells
                        for search_idx in range(max(0, col_idx - 2), min(len(row_values), col_idx + 2)):
                            search_text = row_values[search_idx]
                            for keyword in allergy_keywords:
                                if keyword in search_text:
                                    allergy_name = keyword
                                    break
                            if allergy_name:
                                break
                    
                    if allergy_name and allergy_name not in contains_allergies:
                        contains_allergies.append(allergy_name)
                
                # Check for share symbol (○, ▲)
                elif any(symbol in cell_text for symbol in share_symbols):
                    allergy_name = None
                    if col_idx < len(header_allergies):
                        allergy_name = header_allergies[col_idx]
                    else:
                        for search_idx in range(max(0, col_idx - 2), min(len(row_values), col_idx + 2)):
                            search_text = row_values[search_idx]
                            for keyword in allergy_keywords:
                                if keyword in search_text:
                                    allergy_name = keyword
                                    break
                            if allergy_name:
                                break
                    
                    if allergy_name and allergy_name not in share_allergies:
                        share_allergies.append(allergy_name)
            
            # Format CSV row
            menu_name_escaped = escape_csv_field(menu_name)
            description_escaped = escape_csv_field(description)
            price_escaped = escape_csv_field(price)
            category_escaped = escape_csv_field(category)
            contains_str = f'"{",".join(contains_allergies)}"' if contains_allergies else ''
            share_str = f'"{",".join(share_allergies)}"' if share_allergies else ''
            note_escaped = escape_csv_field('')
            published = 'true'
            
            csv_rows.append(
                f'{menu_name_escaped},{description_escaped},{price_escaped},{category_escaped},{contains_str},{share_str},{note_escaped},{published}'
            )
    
    return '\n'.join(csv_rows)

def escape_csv_field(field: str) -> str:
    """Escape CSV field"""
    if not field:
        return ''
    if ',' in field or '"' in field or '\n' in field:
        escaped = field.replace('"', '""')
        return f'"{escaped}"'
    return field

def main():
    """Main function"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'PDF path required'}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    page_number = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else None
    
    if not os.path.exists(pdf_path):
        print(json.dumps({'error': f'PDF file not found: {pdf_path}'}))
        sys.exit(1)
    
    # Extract tables
    tables = extract_tables_from_pdf(pdf_path, page_number)
    
    if isinstance(tables, dict) and 'error' in tables:
        print(json.dumps(tables))
        sys.exit(1)
    
    if not tables:
        print(json.dumps({'error': 'No tables found in PDF'}))
        sys.exit(1)
    
    # Convert to CSV
    csv_content = convert_to_menu_csv(tables)
    
    # Output as JSON for API consumption
    result = {
        'csv': csv_content,
        'tables_found': len(tables),
        'pages_processed': list(set(t['page'] for t in tables))
    }
    
    print(json.dumps(result, ensure_ascii=False))

if __name__ == '__main__':
    main()
