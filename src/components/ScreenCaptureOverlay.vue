<script setup>
// ============== Framework Imports ==============
import { ref, computed, onUnmounted, nextTick } from "vue";

// ============== Store Imports ==============
import { historyStore } from "../store/history";
import { uiStore } from "../store/ui";

// ============== Component Imports ==============
import Loader from "./Loader.vue";

// ============== Composable Imports ==============
// OCR & Translation
import { extractText, parseHOCRtoBBoxes, parseTSVtoWords } from "../composables/useOCR.js";
import { translateUsingFabrix } from "../composables/useTranslation.js";

// Screen Capture & Positioning
import { captureArea, createPreview, calculateCapturedRect } from "../composables/useScreenCapture.js";
import { calculatePosition } from "../composables/useTextPosition.js";

// Interactions & Monitoring
import { useMonitoring } from "../composables/useMonitoring.js";
import { useDraggable } from "../composables/useDraggable.js";

// ==================== State ====================

const enabled = ref(false);
const selecting = ref(false);
const showGuide = ref(false);

const start = ref({ x: 0, y: 0 });
const current = ref({ x: 0, y: 0 });
const preview = ref(null);
const capturedRect = ref(null);
const lines = ref([]);
const translationPosition = ref('right');
const targetLang = ref('english');

// ==================== Rendering ====================

function addRenderLines(lineDataArray, isMonitoringMode = false) {
  if (!isMonitoringMode) {
    historyStore.addCapture({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      image: preview.value.src,
      lines: lineDataArray
    });
  }

  lineDataArray.forEach(lineData => {
    const position = calculatePosition(lineData, translationPosition.value);
    lines.value.push({
      text: lineData.text,
      x: position.x,
      y: position.y,
      w: position.w,
      h: position.h,
      dragging: false,
      originalText: lineData.originalText || lineData.text,
      originalX: lineData.originalX,
      originalY: lineData.originalY,
      originalW: lineData.originalW,
      originalH: lineData.originalH
    });
  });
}

// ==================== Composables ====================

const { isMonitoring, startMonitoringLoop, stopMonitoringLoop, toggleMonitoring, resetMonitoring } = useMonitoring(
  capturedRect,
  start,
  current,
  preview,
  lines,
  addRenderLines
);

const { dragMouseDown } = useDraggable(lines);

// ==================== Lifecycle ====================

onUnmounted(() => {
  stopMonitoringLoop();
});

// Listen for stop-monitoring request from main process
window.api.on('stop-monitoring-request', () => {
  if (isMonitoring.value) {
    stopMonitoringLoop();
  }
});

// ==================== Controls ====================

function toggleSelection() {
  if (enabled.value) {
    stopSelection();
  } else {
    startSelection();
  }
}

function startSelection() {
  enabled.value = true;
  selecting.value = false;
}

function stopSelection() {
  enabled.value = false;
  selecting.value = false;
}

function refreshOverlay() {
  resetMonitoring();
  enabled.value = false;
  selecting.value = false;
  start.value = { x: 0, y: 0 };
  current.value = { x: 0, y: 0 };
  capturedRect.value = null;
  preview.value = null;
  lines.value = [];
}

// ==================== Translation ====================

// ==================== Translation ====================

async function processCapture() {
  uiStore.setLoading('capturing', 'Capturing screen area...');
  const blob = await captureArea(start.value, current.value);
  if (!blob) return;

  uiStore.setLoading('ocr', 'Extracting text...');
  const data = await extractText(blob);

  const parsedLines = parseTSVtoWords(data.tsv, preview.value.x, preview.value.y);
  console.log("Sentence from OCR: ", parsedLines);

  const delimiter = " ||| ";

  // 1. Add line counts (e.g., "1: ", "2: ") to each line before joining
  const linesWithCounts = parsedLines.map((line, index) => `${index + 1}: ${line.text}`);
  
  // 2. Join the modified lines to send to Fabrix
  const combinedText = linesWithCounts.join(delimiter);
  console.log("Combined lines with counts: ", combinedText);

  uiStore.setLoading('translation', 'Translating text...');

  // 3. Pass the data to Fabrix
  const combinedTranslatedData = await translateUsingFabrix(combinedText, null, targetLang.value);

  // 4. Split the translated data back using the delimiter
  const translatedParts = combinedTranslatedData.split(delimiter);

  // 5. Remove the line counts from the translated text using a Regex
  // This regex looks for "Number: " at the start of the string and removes it
  const translatedLines = parsedLines.map((line, index) => {
    const rawTranslation = translatedParts[index] || line.text;
    const cleanTranslation = rawTranslation.replace(/^\d+:\s*/, ''); 

    return {
      ...line,
      text: cleanTranslation,
      originalText: line.text,
      originalX: line.x,
      originalY: line.y,
      originalW: line.w,
      originalH: line.h
    };
  });

  uiStore.clearLoading();

  // lines.value = []; // commented out in your original code
  addRenderLines(translatedLines, false);
}


// ==================== Mouse Events ====================

function onMouseDown(e) {
  if (!enabled.value) return;
  selecting.value = true;
  start.value = { x: e.screenX, y: e.screenY };
  current.value = { x: e.screenX, y: e.screenY };
}

function onMouseMove(e) {
  if (!selecting.value) return;
  current.value = { x: e.screenX, y: e.screenY };
}

async function onMouseUp() {
  if (!selecting.value) return;
  selecting.value = false;

  await nextTick();

  const blob = await captureArea(start.value, current.value);
  if (!blob) return;

  preview.value = createPreview(blob, start.value, current.value);
  capturedRect.value = calculateCapturedRect(start.value, current.value);
  enabled.value = false;
  await processCapture();
  
}

// ==================== Computed ====================

const selectionStyle = computed(() => ({
  left: Math.min(start.value.x, current.value.x) - window.screenX + "px",
  top: Math.min(start.value.y, current.value.y) - window.screenY + "px",
  width: Math.abs(start.value.x - current.value.x) + "px",
  height: Math.abs(start.value.y - current.value.y) + "px"
}));
</script>

<template>
  <!-- Transversal Loader -->
  <Loader />

  <!-- Controls (Bottom Right) -->
  <div class="controls">
    <!-- Position Selector -->
    <div class="control-group">
      <select id="lang-select" v-model="targetLang" title="Target Language">
        <option value="english">English</option>
        <option value="korean">Korean</option>
      </select>
    </div>

    <!-- Select/Stop Toggle -->
    <button @click="toggleSelection" :class="{ active: enabled }" title="Select Area" class="icon-btn">
      <!-- Scissors Icon (Always shown now for consistency) -->
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="6" cy="6" r="3"></circle>
        <circle cx="6" cy="18" r="3"></circle>
        <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
        <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
        <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
      </svg>
    </button>

    <!-- Monitoring Toggle -->
    <button @click="toggleMonitoring" :class="{ active: isMonitoring }" title="Live Monitoring" class="icon-btn">
      <svg v-if="!isMonitoring" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      </svg>
    </button>

    <!-- Refresh -->
    <button @click="refreshOverlay" title="Refresh" class="icon-btn">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 4v6h-6"></path>
        <path d="M1 20v-6h6"></path>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
    </button>

    <!-- History (New Icon) -->
    <button @click="uiStore.showHistory()" title="History" class="icon-btn">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 3v5h5"></path>
        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"></path>
        <path d="M12 7v5l4 2"></path>
      </svg>
    </button>

    <!-- Guide -->
    <button @click="showGuide = true" class="guide-btn icon-btn" title="Guide">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </button>
  </div>

  <div class="overlay" :class="{ active: enabled }" @mousedown="onMouseDown" @mousemove="onMouseMove"
    @mouseup="onMouseUp">
    <div v-if="enabled" style="pointer-events: auto;" id="overlay-layer"></div>
    <div v-if="selecting" class="selection" :style="selectionStyle" />
  </div>

  <!-- Overlay Text -->
  <div v-for="(line, i) in lines" :key="i" class="overlay-text" @click="dragMouseDown(i, $event)" :style="{
    left: line.x + 'px',
    top: line.y + 'px',
    width: 'fit-content',
  }">
    <div class="data" :title="line.originalText">{{ line.text }}</div>
  </div>

  <!-- Preview -->
  <div v-if="preview" class="preview">
    <h3>Captured Preview</h3>
    <img :src="preview.src" />
  </div>

  <!-- Guide Modal -->
  <div v-if="showGuide" class="modal-backdrop" @click.self="showGuide = false">
    <div class="modal-content">
      <h2>📖 User Guide</h2>
      <div class="guide-steps">
        <div class="step">
          <h3>1. Select Area</h3>
          <p>Click <strong>"Select"</strong> and drag your mouse over the text you want to translate.</p>
        </div>
        <div class="step">
          <h3>2. Choose Position</h3>
          <p>Use the dropdown to decide where the translation appears.</p>
        </div>
        <div class="step highlight">
          <h3>3. Live Monitoring</h3>
          <p>Click <strong>"Monitor"</strong> to watch the selected area. The app will automatically detect
            changes and update the translation every 2 seconds.</p>
        </div>
        <div class="step">
          <h3>4. Interact</h3>
          <p><strong>Drag</strong> the translated text to move it around. Click <strong>"Refresh"</strong> to clear
            everything.</p>
        </div>
      </div>
      <button class="close-btn" @click="showGuide = false">Got it!</button>
    </div>
  </div>
</template>

<style>
/* Global Font Settings */
body {
  user-select: text;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Controls - Bottom Right (Glassmorphism Style) */
.controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10001;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(30, 41, 59, 0.85); /* Dark Slate Blue with opacity */
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  color: #f8fafc;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.control-group select {
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.8);
  color: #f1f5f9;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  font-size: 13px;
  min-width: 110px;
  outline: none;
  transition: all 0.2s;
}

.control-group select:hover {
  border-color: rgba(255, 255, 255, 0.4);
}

.control-group select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.control-group option {
  background: #0f172a;
  color: #fff;
}

.icon-btn {
  padding: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-width: 36px;
  height: 36px;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.3);
}

.icon-btn:active {
  transform: translateY(0);
}

.icon-btn.active {
  background-color: #3b82f6; /* Blue-500 */
  color: white;
  border-color: #3b82f6;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

.guide-btn {
  background-color: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  border-color: rgba(59, 130, 246, 0.4);
}

.guide-btn:hover {
  background-color: rgba(59, 130, 246, 0.4);
  color: #fff;
}

.overlay {
  position: fixed;
  inset: 0;
  pointer-events: auto;
  z-index: 10000;
}

#overlay-layer {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.01);
}

.overlay.active {
  pointer-events: auto;
  cursor: crosshair;
}

.selection {
  position: absolute;
  border: 2px dashed #3b82f6; /* Blue-500 */
  background: rgba(59, 130, 246, 0.2);
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
}

/* UPDATED: Overlay Text Style to match Google Lens */
.overlay-text {
  position: absolute;
  pointer-events: none;
  z-index: 10001;
  
  /* Google Lens Aesthetic */
  background-color: #ffffff;
  opacity: 0.8;
  /* color: #202124; */
  color: blue;
  padding: 4px 4px;
  border-radius: 8px;
  
  /* Border & Shadow */
  border: 1px solid #dadce0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  
  /* Font */
  font-size: 11px;
  
  /* Layout */
  white-space: pre-wrap;
  overflow: hidden;
  text-overflow: ellipsis;
  
  /* Smooth appearance */
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.data {
  white-space: pre-wrap;
  pointer-events: auto;
  cursor: grab;
  display: block;
}

.preview {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 10002;
  background: rgba(30, 41, 59, 0.9);
  backdrop-filter: blur(10px);
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
  /* Size Constraints */
  width: 200px;
  height: 200px;
  box-sizing: border-box;
}

.preview h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  width: 100%;
  text-align: center;
  flex-shrink: 0; /* Prevent header from shrinking */
}

.preview img {
  width: 100%;
  height: 145px;
  object-fit: contain; /* Ensures image fits within 400x400 without cropping */
  display: block;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0,0,0,0.2);
}

/* Guide Modal Styles */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 20000;
}

.modal-content {
  background: #1e293b; /* Dark Slate */
  padding: 30px;
  border-radius: 16px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes zoomIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-content h2 {
  margin-top: 0;
  color: #fff;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 15px;
  font-size: 20px;
}

.guide-steps {
  margin-bottom: 25px;
}

.step {
  margin-bottom: 20px;
}

.step h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #60a5fa; /* Blue-400 */
}

.step p {
  margin: 0;
  font-size: 14px;
  color: #cbd5e1;
  line-height: 1.5;
}

.step.highlight {
  background: rgba(234, 179, 8, 0.1); /* Yellow tint */
  padding: 12px;
  border-radius: 8px;
  border-left: 4px solid #eab308; /* Yellow-500 */
}

.step.highlight h3 {
  color: #facc15; /* Yellow-400 */
}

.close-btn {
  width: 100%;
  padding: 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.2s;
}

.close-btn:hover {
  background-color: #2563eb;
}
</style>
