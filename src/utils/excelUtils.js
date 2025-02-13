import * as XLSX from 'xlsx';

/**
 * Creates and formats an Excel workbook from structured data
 * @param {Object|Array} data - The data to convert
 * @returns {Object} XLSX workbook
 */
export function createExcelWorkbook(data) {
  const workbook = XLSX.utils.book_new();
  
  // Handle case when data is a direct array
  if (Array.isArray(data)) {
    data = { 'Data': data };
  }
  
  // Ensure data is an object
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid data format');
  }

  // Process each section of data
  Object.entries(data).forEach(([key, items]) => {
    // Skip empty sections
    if (!items || items.length === 0) return;

    // Ensure items is an array
    const itemsArray = Array.isArray(items) ? items : [items];
    
    // Get headers from all items
    const headers = [...new Set(itemsArray.flatMap(Object.keys))];
    
    // Skip if no headers found
    if (headers.length === 0) return;
    
    // Prepare sheet data
    const sheetData = [headers];

    // Add data rows
    itemsArray.forEach(item => {
      if (!item || typeof item !== 'object') return;
      
      const row = headers.map(header => {
        const value = item[header];
        
        // Format different value types
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'object') return JSON.stringify(value);
        if (typeof value === 'number') {
          return Number.isInteger(value) ? value.toString() : value.toFixed(2);
        }
        // Remove special characters and format as plain text
        return String(value)
          .replace(/[^\x20-\x7E]/g, '') // Remove non-printable characters
          .trim();
      });
      sheetData.push(row);
    });

    // Skip if no data rows
    if (sheetData.length <= 1) return;

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    worksheet['!cols'] = headers.map(header => ({
      wch: Math.min(Math.max(
        header.length,
        ...sheetData.slice(1).map(row => 
          String(row[headers.indexOf(header)] || '').length
        )
      ) + 2, 50)
    }));

    // Add header styling
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = 0; col <= range.e.c; col++) {
      const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
      headerCell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "E6E6E6" } },
        alignment: { horizontal: "center" }
      };
    }

    // Use a valid sheet name (max 31 chars, no special chars)
    const sheetName = key
      .replace(/[^\w\s-]/g, '')
      .substring(0, 31)
      .trim() || 'Data';
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  return workbook;
}

/**
 * Exports data to Excel file
 * @param {Object|Array} data - The data to export
 * @param {string} filename - Output filename
 * @returns {Blob} Excel file as blob
 */
export function exportToExcel(data, filename) {
  if (!data) {
    throw new Error('No data provided');
  }

  const workbook = createExcelWorkbook(data);
  
  if (!workbook.SheetNames.length) {
    throw new Error('No valid data to convert');
  }

  const blob = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });

  return new Blob([blob], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
}