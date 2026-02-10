<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import Tesseract from "tesseract.js";
import { historyStore } from "../store/history";
import { uiStore } from "../store/ui";

const enabled = ref(false);
const selecting = ref(false);

const start = ref({ x: 0, y: 0 });
const current = ref({ x: 0, y: 0 });

const preview = ref(null);
const capturedRect = ref(null);

const lines = ref([]);

/* =========================
   Dragging OCR text
========================= */

let offsetX = 0;
let offsetY = 0;

const dragMouseDown = (index, e) => {
  const line = lines.value[index];
  line.dragging = true;

  offsetX = e.clientX - line.x;
  offsetY = e.clientY - line.y;

  const onMove = (e) => {
    if (!line.dragging) return;
    line.x = e.clientX - offsetX;
    line.y = e.clientY - offsetY;
  };

  const onUp = () => {
    line.dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
};

/* =========================
   Controls
========================= */

function startSelection() {
  enabled.value = true;
  selecting.value = false;
}

function stopSelection() {
  enabled.value = false;
  selecting.value = false;
}

function refreshOverlay() {
  enabled.value = false;
  selecting.value = false;
  start.value = { x: 0, y: 0 };
  current.value = { x: 0, y: 0 };
  capturedRect.value = null;
  preview.value = null;
  lines.value = [];
}

/* =========================
   Mouse (SCREEN COORDS ONLY)
========================= */

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
  const blob = await captureArea();
  if (!blob) return;

  const data = await extractText(blob);

  console.log("OCR TEXT : ", data);
  const finalRenderingTranslation = await translatePreserveFormatting(data.text);
  console.log('finalRenderingTranslation : ',finalRenderingTranslation);
  addRenderLine(finalRenderingTranslation);
}

/* =========================
  Translate line by line
========================= */

async function translatePreserveFormatting(text) {
    // Match lines INCLUDING their line breaks
    const parts = text.match(/.*?(?:\r\n|\n|$)/g);

    const translatedParts = await Promise.all(
        parts.map(async (part) => {
            // If this is purely a line break
            if (/^(?:\r\n|\n)$/.test(part)) {
                return part;
            }

            // Separate content from its line break
            const match = part.match(/^(.*?)(\r\n|\n|$)$/);
            const line = match[1];
            const newline = match[2];

            // Preserve empty / whitespace-only lines
            if (/^\s*$/.test(line)) {
                return line + newline;
            }

            // Capture leading + trailing whitespace
            const wsMatch = line.match(/^(\s*)(.*?)(\s*)$/);
            const leading = wsMatch[1];
            const content = wsMatch[2];
            const trailing = wsMatch[3];

            const translatedData = await window.api.translate(content);
            const translatedText = await translatedDataProcessing(translatedData);

            return leading + translatedText + trailing + newline;
        })
    );

    return translatedParts.join('');
}



/* =========================
  Translated Data processing
========================= */

function translatedDataProcessing(translatedData) {
    return translatedData?.data?.translations[0]?.translatedText;
}

/* =========================
   OCR
========================= */

async function extractText(blob) {
  const result = await Tesseract.recognize(blob, "eng+kor", {
    logger: m => console.log(m),
  });
  return result.data;
}

/* =========================
   Rendering OCR
========================= */

function addRenderLine(data) {

    historyStore.addCapture({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        image: preview.value.src,
        lines: data
      });

  lines.value.push({
    text: data,
    x: preview.value.x,
    y: preview.value.y,
    w: preview.value.w,
    h: preview.value.h,
    dragging: false
  });
}

/* =========================
   Screen Capture (FIXED)
========================= */

async function captureArea() {
  const x = Math.min(start.value.x, current.value.x);
  const y = Math.min(start.value.y, current.value.y);
  const width = Math.abs(start.value.x - current.value.x);
  const height = Math.abs(start.value.y - current.value.y);

  if (width < 5 || height < 5) return null;

  const bytes = await window.api.captureArea({
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height)
  });

  const blob = new Blob([bytes], { type: "image/png" });
  const url = URL.createObjectURL(blob);

  preview.value = {
    src: url,
    x,
    y,
    w: width,
    h: height
  };

  capturedRect.value = { x, y, width, height };
  return blob;
}

/* =========================
   Selection box rendering
========================= */

const selectionStyle = computed(() => ({
  left: Math.min(start.value.x, current.value.x) - window.screenX + "px",
  top: Math.min(start.value.y, current.value.y) - window.screenY + "px",
  width: Math.abs(start.value.x - current.value.x) + "px",
  height: Math.abs(start.value.y - current.value.y) + "px"
}));
</script>

<template>
  <div class="controls">
    <button @click="startSelection">Start</button>
    <button @click="stopSelection">Stop</button>
    <button @click="refreshOverlay">Refresh</button>
    <button @click="uiStore.showHistory()">History</button>
  </div>


  <div class="overlay" :class="{ active: enabled }" @mousedown="onMouseDown" @mousemove="onMouseMove"
    @mouseup="onMouseUp">
    <h1> This is the testing text </h1>
    <div v-if="selecting" class="selection" :style="selectionStyle" />
  </div>

  <!-- OCR text -->
  <div v-for="(line, i) in lines" :key="i" class="overlay-text" @dblclick="dragMouseDown(i, $event)" :style="{
    left: line.x + 'px',
    top: line.y + 'px',
    width: line.w + 'px',
    height: line.h + 'px'
  }">
    <div class="data">{{ line.text }}</div>
  </div>

  <!-- Preview -->
  <div v-if="preview" class="preview">
    <h3>Captured Preview</h3>
    <img :src="preview.src" />
  </div>
</template>

<style>
.controls {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 10001;
}

.overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10000;
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
}

.data {
  white-space: pre-wrap;
  pointer-events: auto;
  cursor: grab;
}

.preview {
  position: fixed;
  bottom: 10px;
  left: 10px;
  z-index: 10002;
  background: white;
  padding: 10px;
  border: 1px solid #ccc;
}

.preview img {
  max-width: 300px;
  max-height: 200px;
}

body {
  -webkit-user-select: none;
}
</style>
