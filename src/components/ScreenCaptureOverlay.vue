<script setup>
// ============== Framework Imports ==============
import { ref, computed, onUnmounted, nextTick } from "vue";

// ============== Store Imports ==============
import { historyStore } from "../store/history";
import { uiStore } from "../store/ui";

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

async function processCapture() {
  const blob = await captureArea(start.value, current.value);
  if (!blob) return;

  const data = await extractText(blob);
  const parsedLines = parseTSVtoWords(data.tsv, preview.value.x, preview.value.y);
  console.log("Sentence from OCR: ",parsedLines);
  const delimiter = " ||| ";
  const combinedText = parsedLines.map(line => line.text).join(delimiter);
  console.log("Combined lines : ", combinedText);
  const combinedTranslatedData = await translateUsingFabrix(combinedText);
  const translatedParts = combinedTranslatedData.split(delimiter);
  const translatedLines = parsedLines.map((line, index) => ({
    ...line,
    text: translatedParts[index] || line.text,
    originalText: line.text,
    originalX: line.x,
    originalY: line.y,
    originalW: line.w,
    originalH: line.h
  }));

  //lines.value = [];
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
  <!-- Controls (Bottom Right) -->
  <div class="controls">
    <!-- Position Selector -->
    <div class="control-group">
      <select id="position-select" v-model="translationPosition" title="Translation Position">
        <option value="bottom">⬇ Bottom</option>
        <option value="top">⬆ Top</option>
        <option value="left">⬅ Left</option>
        <option value="right">➡ Right</option>
      </select>
    </div>

    <!-- Select/Stop Toggle -->
    <button @click="toggleSelection" :class="{ active: enabled }" title="Select Area">
      <span v-if="enabled">⏹ Stop</span>
      <span v-else>⛶ Select</span>
    </button>

    <!-- Monitoring Toggle -->
    <button @click="toggleMonitoring" :class="{ active: isMonitoring }" title="Live Monitoring">
      <span v-if="isMonitoring">⏹ Monitor</span>
      <span v-else>👁 Monitor</span>
    </button>

    <!-- Refresh -->
    <button @click="refreshOverlay" title="Refresh">↻</button>

    <!-- History -->
    <button @click="uiStore.showHistory()" title="History">🗂</button>

    <!-- Guide -->
    <button @click="showGuide = true" class="guide-btn" title="Guide">?</button>
  </div>

  <div class="overlay" :class="{ active: enabled }" @mousedown="onMouseDown" @mousemove="onMouseMove"
    @mouseup="onMouseUp">
    <div v-if="enabled" style="pointer-events: auto;" id="overlay-layer"></div>
    <div v-if="selecting" class="selection" :style="selectionStyle" />
  </div>

  <!-- Overlay Text (Static Styles) -->
  <div v-for="(line, i) in lines" :key="i" class="overlay-text" @click="dragMouseDown(i, $event)" :style="{
    left: line.x + 'px',
    top: line.y + 'px',
    width: 'fit-content',
    height: line.h + 'px'
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
          <p>Click <strong>"⛶ Select"</strong> and drag your mouse over the text you want to translate.</p>
        </div>
        <div class="step">
          <h3>2. Choose Position</h3>
          <p>Use the dropdown to decide where the translation appears.</p>
        </div>
        <div class="step highlight">
          <h3>3. Live Monitoring</h3>
          <p>Click <strong>"👁 Monitor"</strong> to watch the selected area. The app will automatically detect
            changes and update the translation every 2 seconds.</p>
        </div>
        <div class="step">
          <h3>4. Interact</h3>
          <p><strong>Drag</strong> the translated text to move it around. Click <strong>"↻"</strong> to clear
            everything.</p>
        </div>
      </div>
      <button class="close-btn" @click="showGuide = false">Got it!</button>
    </div>
  </div>
</template>

<style>
/* Controls - Bottom Right */
.controls {
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10001;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #ddd;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.control-group select {
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  min-width: 100px;
}

.control-group select:hover {
  border-color: #00aaff;
}

.control-group select:focus {
  outline: none;
  border-color: #00aaff;
  box-shadow: 0 0 5px rgba(0, 170, 255, 0.3);
}

.controls button {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 16px; /* Larger for icons */
  line-height: 1;
  min-width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.controls button:hover {
  background: #f0f0f0;
  border-color: #00aaff;
  transform: translateY(-1px);
}

.controls button:active {
  transform: translateY(0);
}

.controls button.active {
  background-color: #00aaff;
  color: white;
  border-color: #0088cc;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}

.guide-btn {
  background-color: #e3f2fd;
  color: #0056b3;
  font-weight: bold;
  border-color: #90caf9;
}

.guide-btn:hover {
  background-color: #bbdefb;
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
  border: 2px dashed #00aaff;
  background: rgba(0, 170, 255, 0.25);
}

.overlay-text {
  position: absolute;
  pointer-events: none;
  color: green;
  font-family: monospace;
  z-index: 10001;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #ccc;
  padding: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.data {
  white-space: pre-wrap;
  pointer-events: auto;
  cursor: grab;
  font-size: 12px;
  line-height: 1.2;
}

.preview {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 10002;
  background: white;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.preview img {
  max-width: 300px;
  max-height: 200px;
  display: block;
}

/* Guide Modal Styles */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 20000;
}

.modal-content {
  background: white;
  padding: 25px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.modal-content h2 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #00aaff;
  padding-bottom: 10px;
}

.guide-steps {
  margin-bottom: 20px;
}

.step {
  margin-bottom: 15px;
}

.step h3 {
  margin: 0 0 5px 0;
  font-size: 16px;
  color: #0056b3;
}

.step p {
  margin: 0;
  font-size: 14px;
  color: #555;
  line-height: 1.4;
}

.step.highlight {
  background-color: #fff3cd;
  padding: 10px;
  border-radius: 4px;
  border-left: 4px solid #ffc107;
}

.close-btn {
  width: 100%;
  padding: 10px;
  background-color: #00aaff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
}

.close-btn:hover {
  background-color: #0088cc;
}

body {
  user-select: text;
}
</style>
