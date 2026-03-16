<script setup>
import { ref, watch, nextTick, onMounted } from "vue";
import { uiStore } from "./store/ui";
import History from "./components/History.vue";
import ScreenCaptureOverlay from "./components/ScreenCaptureOverlay.vue";

const appUI = ref(null);

// --- Constants: interactive selectors ---
const INTERACTIVE_SELECTORS = [
  ".controls",
  ".transversal-loader",
  ".capture-sidebar",
  ".minimize-button",
  ".modal-backdrop",
];

// --- Get the currently relevant overlay ---
function getActiveOverlay() {
  if (!appUI.value) return null;

  const screenOverlay = appUI.value.querySelector(".overlay.active");
  if (screenOverlay) return screenOverlay;

  const historyOverlay = appUI.value.querySelector(".capture-overlay");
  if (historyOverlay && uiStore.captureActive?.capture) return historyOverlay;

  return appUI.value.querySelector(".overlay"); // fallback simple overlay
}

// --- Determine if pointer is over any interactive UI element ---
function isPointerOverInteractive(target) {
  if (!target) return false;

  const interactiveEls = appUI.value.querySelectorAll(INTERACTIVE_SELECTORS.join(", "));
  return Array.from(interactiveEls).some(el => el === target || el.contains(target));
}

// --- Update pointer events based on hover and overlay states ---
function updatePointerState(e) {
  const pointerTarget = e?.target || document.elementFromPoint(window.event?.clientX || 0, window.event?.clientY || 0);

  // Step 1: Interactive UI → always clickable
  if (isPointerOverInteractive(pointerTarget)) {
    window.api.setIgnoreMouse(false);
    return;
  }

  // Step 2: History capture overlay active → make full history page interactive
  const historyPage = appUI.value.querySelector(".history-page");
  const historyOverlay = historyPage?.querySelector(".capture-overlay");
  const historyActive = historyOverlay && uiStore.captureActive?.capture;

  if (historyPage && historyActive) {
    window.api.setIgnoreMouse(false);
    historyPage.style.pointerEvents = "auto";
    return;
  } else if (historyPage) {
    historyPage.style.pointerEvents = "auto"; // reset default
  }

  // Step 3: Overlay behavior
  const overlayEl = getActiveOverlay();
  const isOverlayActive = overlayEl?.classList.contains("active") || overlayEl?.classList.contains("capture-overlay");

  if (overlayEl && overlayEl.contains(pointerTarget) && isOverlayActive) {
    overlayEl.style.pointerEvents = "auto";
    overlayEl.style.cursor = "crosshair";
    window.api.setIgnoreMouse(false);
  } else {
    if (overlayEl) {
      overlayEl.style.pointerEvents = "none";
      overlayEl.style.cursor = "default";
    }
    window.api.setIgnoreMouse(true);
  }
}

// --- Lifecycle: mounted ---
onMounted(() => {
  appUI.value = document.querySelector(".app-ui");

  // Track pointer inside app UI
  appUI.value.addEventListener("pointermove", updatePointerState);
  appUI.value.addEventListener("pointerleave", (e) => updatePointerState(e));
});

// --- Watch overlay state changes ---
watch(
  () => [uiStore.enabled, uiStore.captureActive?.capture],
  async () => {
    await nextTick();
    updatePointerState();
  },
  { immediate: true }
);
</script>

<template>
  <div ref="appUI" class="app-ui">
    <History v-if="uiStore.view === 'history'" />
    <ScreenCaptureOverlay v-else />
  </div>
</template>

<style scoped>
/* All cursor and pointer-events handled dynamically in JS */
</style>