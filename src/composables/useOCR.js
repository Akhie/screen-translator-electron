import { createWorker } from "tesseract.js";

/**
 * Extract text from image blob using Tesseract OCR
 * @param {Blob} blob - Image blob to process
 * @returns {Promise<Object>} OCR result containing hocr data
 */
export async function extractText(blob) {
  const worker = await createWorker('kor+eng');
  // await worker.setParameters({
  //   tessedit_pageseg_mode: 6,
  //   preserve_interword_spaces: '1',
  //   user_defined_dpi: '300'
  // })
  const result = await worker.recognize(blob, {}, { 
    hocr: true,
    tsv: true
  });
  console.log("OCR Result : ", result.data);
  //parseTSVtoWords(result.data.tsv); // Debug log
  return result.data;
}

/**
 * Parse HOCR data to extract bounding boxes and text
 * @param {string} hocrData - HOCR formatted string
 * @param {number} offsetX - X offset for positioning
 * @param {number} offsetY - Y offset for positioning
 * @returns {Array} Array of parsed line objects
 */
export function parseHOCRtoBBoxes(hocrData, offsetX, offsetY) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(hocrData, 'text/html');
  const lines = [];
  const ocrLines = doc.querySelectorAll('.ocr_line');

  ocrLines.forEach(line => {
    const title = line.getAttribute('title');
    if (title && title.includes('bbox')) {
      const bboxMatch = title.match(/bbox\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
      if (bboxMatch) {
        const x0 = parseInt(bboxMatch[1]);
        const y0 = parseInt(bboxMatch[2]);
        const x1 = parseInt(bboxMatch[3]);
        const y1 = parseInt(bboxMatch[4]);
        let text = line.textContent;
        text = text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

        if (text) {
          lines.push({
            text: text,
            x: offsetX + x0,
            y: offsetY + y0,
            w: x1 - x0,
            h: y1 - y0,
            dragging: false
          });
        }
      }
    }
  });
  console.log("Extracted lines : ", lines);
  return lines;
}

/**
 * Parse TSV data to extract word positions and text
 * @param {string} tsvData - TSV formatted string
 * @param {number} offsetX - X offset for positioning
 * @param {number} offsetY - Y offset for positioning
 * @returns {Array} Array of word objects with position
 */
export function parseTSVtoWords(tsvData, offsetX = 0, offsetY = 0) {
  const lines = tsvData.split('\n');
  const words = [];
  
  // Skip header (first line)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split('\t');
    
    // Tesseract TSV format:
    // level	page_num	block_num	par_num	line_num	word_num	left	top	width	height	conf	text
    // Level 5 typically indicates a word
    if (columns.length >= 12) {
      const level = parseInt(columns[0]);
      const left = parseInt(columns[6]);
      const top = parseInt(columns[7]);
      const width = parseInt(columns[8]);
      const height = parseInt(columns[9]);
      const text = columns[11];
      
      if (level === 5 && text && text.trim() !== '') {
        words.push({
          text: text.trim(),
          x: offsetX + left,
          y: offsetY + top,
          w: width,
          h: height,
          dragging: false
        });
      }
    }
  }
  
  console.log("Extracted words from TSV : ", words);
  const sentences = groupWordsIntoSentences(words)
  return sentences;
}

/**
 * Group words into sentences based on X and Y proximity
 * @param {Array} words - Array of word objects with x, y, w, h, text
 * @returns {Array} Array of sentence objects with combined text and bounding box
 */
export function groupWordsIntoSentences(words) {
  if (!words || words.length === 0) return [];

  // Sort words by Y, then by X to ensure correct processing order
  const sortedWords = [...words].sort((a, b) => {
    if (Math.abs(a.y - b.y) < 10) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const sentences = [];
  let currentSentence = [sortedWords[0]];

  for (let i = 1; i < sortedWords.length; i++) {
    const currentWord = sortedWords[i];
    const prevWord = sortedWords[i - 1];

    const prevRightEdge = prevWord.x + prevWord.w;
    const xGap = currentWord.x - prevRightEdge;
    const yDiff = Math.abs(currentWord.y - prevWord.y);

    // Rules for starting a new sentence:
    // 1. Y difference is significant (new row)
    // 2. X gap is more than 100px (new column/table cell)
    const isNewSentence = yDiff > 10 || xGap > 50;

    if (isNewSentence) {
      // Finalize the current sentence
      sentences.push(createSentenceObject(currentSentence));
      // Start a new sentence
      currentSentence = [currentWord];
    } else {
      // Add to current sentence
      currentSentence.push(currentWord);
    }
  }

  // Don't forget the last sentence
  if (currentSentence.length > 0) {
    sentences.push(createSentenceObject(currentSentence));
  }

  console.log("Grouped sentences : ", sentences);
  return sentences;
}

/**
 * Helper function to create a sentence object from a group of words
 * @param {Array} sentenceWords - Array of words in the sentence
 * @returns {Object} Sentence object with text and bounding box
 */
function createSentenceObject(sentenceWords) {
  const minX = Math.min(...sentenceWords.map(w => w.x));
  const maxX = Math.max(...sentenceWords.map(w => w.x + w.w));
  const minY = Math.min(...sentenceWords.map(w => w.y));
  const maxY = Math.max(...sentenceWords.map(w => w.y + w.h));

  const text = sentenceWords.map(w => w.text).join(' ');

  return {
    text: text,
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    dragging: false
  };
}