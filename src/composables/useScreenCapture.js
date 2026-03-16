/**
 * Capture screen area and return blob
 * @param {Object} start - Start coordinates {x, y}
 * @param {Object} current - Current coordinates {x, y}
 * @returns {Promise<Blob|null>} Captured image blob or null if invalid
 */
export async function captureArea(start, current) {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const width = Math.abs(start.x - current.x);
  const height = Math.abs(start.y - current.y);

  if (width < 5 || height < 5) return null;

  const bytes = await window.api.captureArea({
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  });

  const blob = new Blob([bytes], { type: "image/png" });
  return blob;
}

/**
 * Create preview object from captured blob
 * @param {Blob} blob - Captured image blob
 * @param {Object} start - Start coordinates
 * @param {Object} current - Current coordinates
 * @returns {Object} Preview object with src and position
 */
export function createPreview(blob, start, current) {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const width = Math.abs(start.x - current.x);
  const height = Math.abs(start.y - current.y);

  const url = URL.createObjectURL(blob);

  return {
    src: url,
    x,
    y,
    w: width,
    h: height
  };
}

/**
 * Calculate captured rectangle from start and current coordinates
 * @param {Object} start - Start coordinates
 * @param {Object} current - Current coordinates
 * @returns {Object} Captured rectangle
 */
export function calculateCapturedRect(start, current) {
  const x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);
  const width = Math.abs(start.x - current.x);
  const height = Math.abs(start.y - current.y);

  return { x, y, width, height };
}