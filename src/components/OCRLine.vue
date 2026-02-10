<!-- components/OCRLine.vue -->
<template>
  <div class="ocr-line">
    {{ line }}
  </div>
</template>

<script setup>
defineProps({ line: Object });
</script>

<style>
.ocr-line {
  padding: 4px 6px;
  background: rgba(255, 255, 0, 0.2);
  margin-bottom: 4px;
  white-space: pre-wrap;
  line-height: inherit;
}
</style>
