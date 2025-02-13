import mammoth from 'mammoth';

function findJsonObjects(text) {
  const jsonRegex = /(\{(?:[^{}]|(?:\{[^{}]*\}))*\}|\[(?:[^\[\]]|(?:\[.*?\]))*\])/g;
  const potentialMatches = text.match(jsonRegex) || [];
  let results = {};
  
  potentialMatches.forEach(match => {
    try {
      const cleaned = match
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\n\s*(["}\\])/g, '$1')
        .replace(/([{[]),\s*\n\s*/g, '$1')
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ');

      const parsed = JSON.parse(cleaned);
      
      // Process nested objects recursively
      function processNestedObjects(obj) {
        if (typeof obj !== 'object' || obj === null) return;
        
        Object.entries(obj).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            // Store array data with its key
            results[key] = value;
          } else if (typeof value === 'object') {
            // If it's an object, process its contents
            processNestedObjects(value);
          }
        });
      }
      
      // Start processing from the root object
      processNestedObjects(parsed);
      
      // If no arrays were found, store the entire object
      if (Object.keys(results).length === 0) {
        const rootKey = Object.keys(parsed)[0] || 'Data';
        results[rootKey] = [parsed];
      }
    } catch (e) {
      console.error('Failed to parse JSON:', e);
    }
  });
  
  return results;
}

function normalizeData(data) {
  if (!data || typeof data !== 'object') return { 'Data': [] };
  
  const normalized = {};
  
  Object.entries(data).forEach(([key, value]) => {
    // Ensure value is an array
    const arrayValue = Array.isArray(value) ? value : [value];
    
    // Clean and normalize each item in the array
    normalized[key] = arrayValue.map(item => {
      if (typeof item !== 'object' || item === null) {
        return { value: String(item) };
      }
      
      // Clean each value in the object
      const cleanedItem = {};
      Object.entries(item).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          cleanedItem[k] = v.join(', ');
        } else if (v && typeof v === 'object') {
          cleanedItem[k] = JSON.stringify(v);
        } else {
          cleanedItem[k] = v === null || v === undefined ? '' : String(v).trim();
        }
      });
      
      return cleanedItem;
    }).filter(item => Object.keys(item).length > 0);
  });
  
  return normalized;
}

export async function parseDocument(input, isWordDoc = false) {
  try {
    let text;
    
    if (isWordDoc) {
      const arrayBuffer = await input.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      text = result.value;
    } else {
      text = input;
    }

    // Add console.log to debug the input
    console.log('Input text:', text);
    
    // Find and parse JSON objects
    const jsonData = findJsonObjects(text);
    
    // Add console.log to debug parsed data
    console.log('Parsed JSON data:', jsonData);
    
    if (Object.keys(jsonData).length === 0) {
      throw new Error('No valid JSON data found in the document');
    }

    // Normalize the data
    const normalizedData = normalizeData(jsonData);
    
    // Add console.log to debug normalized data
    console.log('Normalized data:', normalizedData);
    
    // Ensure we have at least one non-empty section
    const hasValidData = Object.values(normalizedData).some(arr => arr.length > 0);
    if (!hasValidData) {
      throw new Error('No valid data entries found in the document');
    }

    return normalizedData;
  } catch (error) {
    console.error('Error details:', error);
    throw new Error(
      'Could not parse the document. Please ensure:\n' +
      '- The document contains valid JSON data\n' +
      '- Each JSON object is properly formatted\n' +
      '- There are no special characters or formatting issues'
    );
  }
}