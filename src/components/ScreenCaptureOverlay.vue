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
   Dragging OCR text (Single Click Toggle)
========================= */

let offsetX = 0;
let offsetY = 0;

const dragMouseDown = (index, e) => {
  const line = lines.value[index];

  const onMove = (e) => {
    if (!line.dragging) return;
    line.x = e.clientX - offsetX;
    line.y = e.clientY - offsetY;
  };

  const onUp = () => {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  };

  // 1. If it is already dragging, we stop it (Inactive)
  if (line.dragging) {
    line.dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    return;
  }

  // 2. If it is not dragging, we start it (Active)
  line.dragging = true;

  // Calculate the offset so the box doesn't "jump" to the mouse cursor's top-left
  offsetX = e.clientX - line.x;
  offsetY = e.clientY - line.y;

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
};

/* ===============================
  Start Automatic Text translation
================================ */

async function startTranslation() {
  start.value = { x: 0, y: 0 };
  current.value = { x: 1920, y: 1080 };
  //capture the screen 
  await nextTick();
  const blob = await captureArea();
  if (!blob) return;

  const data = await extractText(blob);

  console.log("OCR TEXT LIVE : ", data);
  // translate it
  const finalRenderingTranslation = await translatePreserveFormatting(data.text);
  console.log('finalRenderingTranslation : ',finalRenderingTranslation);
  // render it back
  addRenderLine(finalRenderingTranslation);
}

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
    // 1. Parse the original text into parts to preserve structure
    // We capture the line content AND the line break character
    const parts = text.match(/.*?(?:\r\n|\n|$)/g) || [text];

    // Map to objects so we can keep track of metadata (original content, whitespace, etc.)
    const lineData = parts.map(part => {
        // Check if it's purely a line break (empty line)
        if (/^(?:\r\n|\n)$/.test(part)) {
            return { type: 'break', content: part };
        }

        // Separate content from its line break
        const match = part.match(/^(.*?)(\r\n|\n|$)$/);
        const line = match[1];
        const newline = match[2];

        // Preserve empty / whitespace-only lines
        if (/^\s*$/.test(line)) {
            return { type: 'whitespace', content: line + newline };
        }

        // Capture leading + trailing whitespace for formatting
        const wsMatch = line.match(/^(\s*)(.*?)(\s*)$/);
        const leading = wsMatch[1];
        const content = wsMatch[2]; // The actual text to translate
        const trailing = wsMatch[3];

        return { type: 'text', leading, content, trailing, newline };
    });

    // 2. Prepare the payload for the API
    // Join all actual text content with a special delimiter (e.g., " ||| ")
    // This allows us to split the result back into individual lines later.
    const delimiter = " ||| ";
    
    const textToTranslate = lineData
        .filter(item => item.type === 'text')
        .map(item => item.content)
        .join(delimiter);

    // If there is nothing to translate, return original
    if (!textToTranslate.trim()) return text;

    // 3. Make the SINGLE API call
    try {
        const translatedData = await translate(textToTranslate);
        const translatedText = translatedDataProcessing(translatedData);

        // 4. Process the result
        // Split the translated string back into an array using our delimiter
        const translatedParts = translatedText.split(delimiter);

        // 5. Reconstruct the final string preserving original formatting
        let translatedIndex = 0;
        const finalParts = lineData.map(item => {
            if (item.type === 'break') {
                return item.content; // Preserve empty lines
            }
            if (item.type === 'whitespace') {
                return item.content; // Preserve whitespace lines
            }
            if (item.type === 'text') {
                // Get the corresponding translated part
                const translated = translatedParts[translatedIndex] || ""; 
                translatedIndex++;
                
                // Re-attach original leading/trailing whitespace and line breaks
                return item.leading + translated + item.trailing + item.newline;
            }
            return "";
        });

        return finalParts.join('');

    } catch (error) {
        console.error("Translation failed:", error);
        return text; // Fallback to original text on error
    }
}

/* =========================
  Translation
========================= */

function translate(text) {
  var settings = {
  url: "https://nsds-api.fabrix-s.samsungsds.com/sds/trial/api-chat/openapi/chat/v1/models",
  method: "GET",
  timeout: 0,
  headers: {
    "Content-Type": "application/json",
    "x-fabrix-client": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJjbGllbnRJZCI6IjIyM2M3MGFkLWQwNTctNGQ4MC1iM2U4LTNlMzc3MDdkMWQwYy0xMDI5IiwiY2xpZW50U2VjcmV0IjoiUG1BUW92clI2NkJ3MThhODFSZDVMck9XZXRQbWxkbjciLCJleHAiOjE3NzI3MjI3OTl9.NCQHQWIhiw9azlz4JNGZgsW9llJYEDL3GgyIdxkDdXU",
    "x-openapi-token": "Bearer eyJ4NXQiOiJNV0l5TkRJNVlqRTJaV1kxT0RNd01XSTNOR1ptTVRZeU5UTTJOVFZoWlRnMU5UTTNaVE5oTldKbVpERTFPVEE0TldFMVlUaGxNak5sTldFellqSXlZUSIsImtpZCI6Ik1XSXlOREk1WWpFMlpXWTFPRE13TVdJM05HWm1NVFl5TlRNMk5UVmhaVGcxTlRNM1pUTmhOV0ptWkRFMU9UQTROV0UxWVRobE1qTmxOV0V6WWpJeVlRX1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI4NzdhNmMzNS04ZWU5LTQ1MGItODc1MS00N2MzMDUxMzQ5OTUiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6IllVXzZkNGN1Wl9TSVRCc21FT1dGakJkMUZfb2EiLCJuYmYiOjE3NzAzNzcwMTMsImF6cCI6IllVXzZkNGN1Wl9TSVRCc21FT1dGakJkMUZfb2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvbnNkcy13c28yLmZhYnJpeC1zLnNhbXN1bmdzZHMuY29tOjQ0M1wvb2F1dGgyXC90b2tlbiIsImV4cCI6NDkyNjEzNzAxMywiaWF0IjoxNzcwMzc3MDEzLCJqdGkiOiI3YzMyM2ExNi0wZDVjLTQ2OWUtOGM5My0yYjgwZTcxY2YyMjEiLCJjbGllbnRfaWQiOiJZVV82ZDRjdVpfU0lUQnNtRU9XRmpCZDFGX29hIn0.XZy-tWJtMPC1kvWkKYdOJvW4uSYUYTwEGON-Fk4X8eyufIMCoyHgGXU04zQfDt0uddRYJcD4CP1PTUb4pq5pIy9ptqc9mUGZMW8z1HHR8wAN-EZsQ2i23Qtvlu5zMOJ1cY-LQO02kF0sedrBRpYWT-R9V6Zq1b7Nt-zpj7jirf9ChFznk6cLHqyVw9x5EFJrL3lqc-3yFmAeC5lySVkjfUn959w5OBw6uzj7tC9SmWgtxmba5MkqSd-qBj9Fec7ocYXuJz4u8IcXtSgpBCmj8s6S2sRTnopwulOn8VZNhmyX6APhILLc16plwjlSJKVcrbviuYMFavYrHYL0CsSRUA",
    "x-generative-ai-user-email": "davinder.s1@samsung.com",
    "Cookie": "INGRESSCOOKIE=1770376705.393.78081.487324|b8d5e0e3856125cb64402f2f701e65a0"
  },
};
  // translation api call and then return back the translated text
  const url = "https://translation.googleapis.com/language/translate/v2?key=AIzaSyAF_X2CDKkk666sDyQOWtT1prycpWoijUU";

    const data = {
      q: text,
      target: "en",
      source: "ko"
    };
    // ✅ Return the promise chain
    return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log("Response:", response);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        return response.json(); // returns JSON
    })
    .then(result => {
        console.log("Final result:", result);
        return result; // this goes back to ipcRenderer.invoke
    })
    .catch(error => {
        console.error("Error:", error);
        return { error: error.message }; // fallback object
    });
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
  console.log("Extracted :", result);
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
    <button @click="startTranslation">Start</button>
    <button @click="startSelection">Select</button>
    <button @click="stopSelection">Stop</button>
    <button @click="refreshOverlay">Refresh</button>
    <button @click="uiStore.showHistory()">History</button>
  </div>


  <div class="overlay" :class="{ active: enabled }" @mousedown="onMouseDown" @mousemove="onMouseMove"
    @mouseup="onMouseUp">
    <div style="pointer-events: auto;" id="overlay-layer"></div>
    <div v-if="selecting" class="selection" :style="selectionStyle" />
  </div>

  <!-- OCR text -->
  <div v-for="(line, i) in lines" :key="i" class="overlay-text" @click="dragMouseDown(i, $event)" :style="{
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
  user-select: text;
}
</style>
