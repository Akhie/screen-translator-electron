<!-- components/CaptureCard.vue -->
<template>
  <div class="capture-card">
    <img :src="capture.image" class="thumb" />

    <div class="lines">
      <OCRLine :line="capture.lines" />
    </div>

    <div class="meta">
      {{ new Date(capture.timestamp).toLocaleString() }}
    </div>
  </div>
</template>

<script setup>
import OCRLine from "./OCRLine.vue";
defineProps({ capture: Object });
</script>

<style>
.capture-card {
  display: flex;
  border: 1px solid #333;
  padding: 10px;
  margin-bottom: 15px;
}

.thumb {
  max-width: 100%;
  border: 1px solid #555;
}

.lines {
  margin-top: 8px;
}

.meta {
  font-size: 12px;
  opacity: 0.7;
}
</style>
