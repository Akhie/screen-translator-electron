/**
 * Calculate text dimensions by creating a temporary DOM element
 * @param {string} text - Text to measure
 * @returns {Object} Object containing width and height
 */
function measureTextDimensions(text) {
  const measureElement = document.createElement('div');
  measureElement.style.position = 'absolute';
  measureElement.style.visibility = 'hidden';
  measureElement.style.whiteSpace = 'pre-wrap';
  measureElement.style.font = '12px monospace';
  measureElement.style.lineHeight = '1.2';
  measureElement.textContent = text;
  document.body.appendChild(measureElement);
  const width = measureElement.offsetWidth;
  const height = measureElement.offsetHeight;
  document.body.removeChild(measureElement);
  return { width, height };
}

/**
 * Calculate position for translated text with overflow detection
 * @param {Object} line - Line object containing original position and dimensions
 * @param {string} position - Desired position ('top', 'bottom', 'left', 'right')
 * @returns {Object} Position object with x, y, w, h
 */
export function calculatePosition(line, position) {
  const offset = 5;
  // Adjustment to align visual baseline (moves text up)
  const VERTICAL_ADJUSTMENT = -7; 
  
  let finalPosition = position;

  // Measure the ACTUAL dimensions of the translation text
  const { width: textWidth, height: textHeight } = measureTextDimensions(line.text);

  // Check if right position would exceed window width
  if (position === 'right') {
    const rightX = line.originalX + line.originalW + offset;
    if (rightX + textWidth > window.innerWidth) {
      finalPosition = 'top';
    }
  }

  // Check if bottom position would exceed window height
  if (position === 'bottom') {
    const bottomY = line.originalY + line.originalH + offset;
    if (bottomY + textHeight > window.innerHeight) {
      finalPosition = 'top';
    }
  }

  // Check if left position would exceed left edge
  if (position === 'left') {
    const leftX = line.originalX - textWidth - offset;
    if (leftX < 0) {
      finalPosition = 'top';
    }
  }

  return getPositionCoordinates(line, finalPosition, offset, textHeight, textWidth, VERTICAL_ADJUSTMENT);
}

/**
 * Get coordinates for a specific position using Vertical Centering
 * @param {Object} line - Line object
 * @param {string} position - Position type
 * @param {number} offset - Offset from original position
 * @param {number} renderedHeight - The actual height of the translation text
 * @param {number} renderedWidth - The actual width of the translation text
 * @param {number} verticalAdjustment - Pixels to shift up/down
 * @returns {Object} Position coordinates
 */
function getPositionCoordinates(line, position, offset, renderedHeight, renderedWidth, verticalAdjustment) {
  
  const originalCenterY = line.originalY + (line.originalH / 2);

  switch (position) {
    case 'top':
      // FIX: Use Vertical Centering for Top position as well.
      // This aligns the center of the translation with the center of the original.
      return {
        x: line.originalX,
        y: originalCenterY - (renderedHeight / 2) + verticalAdjustment,
        w: renderedWidth,
        h: renderedHeight
      };
    case 'bottom':
      return {
        x: line.originalX,
        y: line.originalY + line.originalH + offset + verticalAdjustment,
        w: renderedWidth,
        h: renderedHeight
      };
    case 'left':
    case 'right':
      return {
        x: position === 'left' 
          ? line.originalX - renderedWidth - offset 
          : line.originalX + line.originalW + offset,
        y: originalCenterY - (renderedHeight / 2) + verticalAdjustment,
        w: renderedWidth,
        h: renderedHeight
      };
    default:
      return {
        x: line.originalX,
        y: line.originalY + line.originalH + offset,
        w: renderedWidth,
        h: renderedHeight
      };
  }
}
