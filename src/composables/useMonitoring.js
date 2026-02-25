import { ref } from 'vue';
import { extractText, parseHOCRtoBBoxes } from './useOCR.js';
import { translateLines } from './useTranslation.js';
import { captureArea, calculateCapturedRect, createPreview } from './useScreenCapture.js';

const POLLING_RATE_MS = 2000;

/**
 * Create monitoring composable
 * @param {Ref} capturedRect - Reactive captured rectangle
 * @param {Ref} start - Start coordinates ref
 * @param {Ref} current - Current coordinates ref
 * @param {Ref} preview - Preview ref
 * @param {Ref} lines - Lines ref
 * @param {Function} addRenderLines - Function to add render lines
 * @returns {Object} Monitoring control functions and state
 */
export function useMonitoring(capturedRect, start, current, preview, lines, addRenderLines) {
  const isMonitoring = ref(false);
  let monitoringInterval = null;
  let previousLinesData = [];
  let isProcessing = false;

  /**
   * Start the monitoring loop
   */
  function startMonitoringLoop() {
    if (!capturedRect.value) {
      alert("Please select an area first!");
      return;
    }

    isMonitoring.value = true;
    console.log("👀 Monitoring started...");

    performMonitoringCycle();
    monitoringInterval = setInterval(performMonitoringCycle, POLLING_RATE_MS);
  }

  /**
   * Stop the monitoring loop
   */
  function stopMonitoringLoop() {
    isMonitoring.value = false;
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
    console.log("⏹️ Monitoring stopped.");
  }

  /**
   * Toggle monitoring state
   */
  function toggleMonitoring() {
    if (isMonitoring.value) {
      stopMonitoringLoop();
    } else {
      startMonitoringLoop();
    }
  }

  /**
   * Perform a single monitoring cycle
   */
  async function performMonitoringCycle() {
    if (!capturedRect.value) return;

    // Skip if already processing
    if (isProcessing) {
      console.log("⏳ Previous cycle still processing, skipping...");
      return;
    }

    isProcessing = true;

    try {
      // Capture area
      const tempStart = { ...start.value };
      const tempCurrent = { ...current.value };

      start.value = { x: capturedRect.value.x, y: capturedRect.value.y };
      current.value = {
        x: capturedRect.value.x + capturedRect.value.width,
        y: capturedRect.value.y + capturedRect.value.height
      };

      const blob = await captureArea(start.value, current.value);

      // Restore coordinates
      start.value = tempStart;
      current.value = tempCurrent;

      if (!blob) return;

      // Update preview with the latest capture
      preview.value = createPreview(blob, capturedRect.value, { 
        x: capturedRect.value.x + capturedRect.value.width, 
        y: capturedRect.value.y + capturedRect.value.height 
      });

      // Process text
      const data = await extractText(blob);
      const parsedLines = parseHOCRtoBBoxes(data.hocr, capturedRect.value.x, capturedRect.value.y);

      // Filter out translated lines
      const filteredParsedLines = parsedLines.filter(ocrLine => {
        const isTranslatedLine = lines.value.some(translatedLine => {
          const posMatch = Math.abs(ocrLine.x - translatedLine.x) < 10 && 
                          Math.abs(ocrLine.y - translatedLine.y) < 10;
          return posMatch;
        });
        return !isTranslatedLine;
      });

      if (filteredParsedLines.length === 0) return;

      // Check for 90%+ change
      if (previousLinesData.length > 0 && !hasSignificantChange(filteredParsedLines, previousLinesData)) {
        return;
      }

      console.log("🆕 90%+ change detected! Updating...");

      // Reset and update
      previousLinesData = [];
      lines.value = [];

      const translatedLines = await translateLines(filteredParsedLines);

      // Update previousLinesData for next comparison
      previousLinesData = filteredParsedLines.map(line => ({ ...line }));

      addRenderLines(translatedLines, true); // true = monitoring mode

    } catch (error) {
      console.error("Error updating live translation:", error);
    } finally {
      isProcessing = false;
    }
  }

  /**
   * Check if there's significant change between line sets
   * @param {Array} newLines - New lines
   * @param {Array} oldLines - Previous lines
   * @returns {boolean} True if 90%+ changed
   */
  function hasSignificantChange(newLines, oldLines) {
    let changedCount = 0;
    
    newLines.forEach(newLine => {
      const isMatch = oldLines.some(oldLine => {
        const textMatch = newLine.text === oldLine.text;
        const posMatch = Math.abs(newLine.x - oldLine.x) < 5 && 
                        Math.abs(newLine.y - oldLine.y) < 5;
        return textMatch && posMatch;
      });

      if (!isMatch) {
        changedCount++;
      }
    });

    const changePercentage = (changedCount / newLines.length) * 100;
    
    if (changePercentage < 90) {
      console.log(`🔄 Only ${changePercentage.toFixed(1)}% changed. Skipping update.`);
      return false;
    }

    return true;
  }

  /**
   * Reset monitoring state
   */
  function resetMonitoring() {
    stopMonitoringLoop();
    previousLinesData = [];
    isProcessing = false;
  }

  return {
    isMonitoring,
    startMonitoringLoop,
    stopMonitoringLoop,
    toggleMonitoring,
    resetMonitoring
  };
}