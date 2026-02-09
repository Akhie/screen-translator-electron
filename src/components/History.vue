<!-- pages/History.vue -->
<template>
  <div class="history-page">
    <button @click="uiStore.showOverlay()">Back</button>
    <button @click="history.clearCaptures()"> Clear History </button>
    <h2>Capture History</h2>

    <div v-if="!history.captures.length" class="empty">
      No captures yet
    </div>

    <CaptureCard v-for="cap in history.captures" :key="cap.id" :capture="cap" />
  </div>
</template>

<script setup>
import { historyStore as history } from "../store/history";
import { uiStore } from '../store/ui'
import CaptureCard from "../components/CaptureCard.vue";
</script>

<style>
.history-page {
  padding: 20px;
  background: #111;
  color: #fff;
}
</style>
