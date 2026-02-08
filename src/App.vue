<script setup>
import { uiStore } from "./store/ui";
import History from "./components/History.vue"
import ScreenCaptureOverlay from "./components/ScreenCaptureOverlay.vue";
</script>

<template>
  <History v-if="uiStore.view === 'history'" />
  <ScreenCaptureOverlay v-else />
</template>
