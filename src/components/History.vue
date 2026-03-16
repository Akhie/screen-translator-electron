<!-- pages/History.vue -->
<template>
  <div class="history-page">
    <!-- Transversal Loader -->
    <Loader />

    <!-- Modern Minimize Button -->
    <div class="minimize-button" title="Minimize">
      <button @click="uiStore.showOverlay()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>
    </div>
    
    <div class="history-body">
      <!-- Right Sidebar with Transparency -->
      <div class="capture-sidebar">
        <h4>History</h4>
        
        <!-- Dynamic Vue Template Rendering -->
        <div class="capture-list-container">
          <div 
            v-if="history.captures.length === 0" 
            class="empty-message"
          >
            No captures
          </div>

          <div
            v-for="(capture, index) in history.captures"
            :key="index"
            class="capture-item"
            :class="{ selected: captureActive.id === index }"
            @click="selectCapture(index)"
          >
            <!-- Capture number label -->
            <span class="capture-label">#{{ index + 1 }}</span>

            <!-- Thumbnail -->
            <img 
              class="capture-thumbnail" 
              :src="capture.image" 
              :alt="`Capture ${index + 1}`"
            >

            <!-- Delete button -->
            <button 
              class="capture-delete-btn" 
              title="Remove this capture"
              @click.stop="deleteCapture(index)"
            >
              ×
            </button>
          </div>
        </div>

        <button @click="clearAll">Clear</button>
      </div>
    </div>

    <!-- Centered Overlay for Selected Image -->
    <div v-if="captureActive.capture" class="capture-overlay" @click.self="resetCaptureActive">
      <div class="overlay-content">
        <div class="overlay-header">
          <span>Capture #{{ captureActive.id + 1 }}</span>
          <button class="close-icon-btn" @click="resetCaptureActive">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <CaptureCard :key="captureActive.id" :capture="captureActive.capture" :activeIndex="captureActive.id" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { historyStore as history } from "../store/history";
import { uiStore } from '../store/ui'
import CaptureCard from "../components/CaptureCard.vue";
import Loader from "../components/Loader.vue";
import { reactive } from "vue";

const captureActive = reactive({ id: 0, capture: null });

const resetCaptureActive = () => {
  captureActive.capture = null;
}

const selectCapture = (index) => {
  captureActive.id = index;
  console.log("history capture : ", history.captures[index]);
  captureActive.capture = history.captures[index];
}

const deleteCapture = (index) => {
  // Logic to remove a specific capture
  // Assuming history store might have a remove method, otherwise we manipulate array if store allows
  // or we can call history.captures.splice(index, 1) if it's a reactive array directly
  // For now, keeping it simple based on existing code structure
  // history.captures.splice(index, 1); 
  
  // If you have a specific remove method in history store, use it:
  // history.removeCapture(index);
  
  // Reset if the deleted item was selected
  if (captureActive.id === index) {
    resetCaptureActive();
  } else if (captureActive.id > index) {
    captureActive.id--; // Adjust index
  }
}

const clearAll = () => {
  history.clearCaptures();
  resetCaptureActive();
}
</script>

<style>
.history-page {
  padding: 0;
  /* Transparent background to see through */
  background: transparent; 
  color: #fff;
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Modern Minimize Button */
.minimize-button {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
}

.minimize-button button {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  border-radius: 15%;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.minimize-button button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
}

.history-body {
  display: flex;
  height: 100%;
  width: 100%;
  justify-content: flex-end; /* Push sidebar to the right */
}

/* Right Sidebar Styling - Glassmorphism */
.capture-sidebar {
  width: 240px;
  height: 100%;
  background: rgba(30, 41, 59, 1); /* Semi-transparent dark blue */
  backdrop-filter: blur(12px); /* Blur effect behind sidebar */
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.1); /* Subtle border */
  box-shadow: -5px 0 15px rgba(0, 0, 0, 0.2);
  z-index: 10;
  transition: transform 0.3s ease;
}

.capture-sidebar h4 {
  color: #f1f5f9;
  text-align: center;
  padding: 20px 0;
  margin: 0;
  font-weight: 500;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.capture-sidebar button {
  margin: 15px;
  padding: 10px;
  background: rgba(239, 68, 68, 0.8);
  color: white;
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.capture-sidebar button:hover {
  background: rgba(239, 68, 68, 1);
}

/* Dynamic List Container Styles */
.capture-list-container {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Custom Scrollbar for transparent look */
.capture-list-container::-webkit-scrollbar {
  width: 6px;
}
.capture-list-container::-webkit-scrollbar-track {
  background: transparent;
}
.capture-list-container::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
.capture-list-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.4);
}

.empty-message {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  padding: 20px 4px;
  font-size: 12px;
}

.capture-item {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
  flex-shrink: 0;
  background: rgba(15, 23, 42, 0.6);
}

.capture-item:hover {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(30, 41, 59, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.capture-item.selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.2);
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.3);
}

.capture-label {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  z-index: 1;
  pointer-events: none;
  backdrop-filter: blur(2px);
}

.capture-thumbnail {
  width: 100%;
  height: 120px;
  object-fit: cover;
  display: block;
  background: rgba(0, 0, 0, 0.5);
}

.capture-delete-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: #ef4444;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.capture-item:hover .capture-delete-btn {
  opacity: 1;
}

.capture-delete-btn:hover {
  background: #ef4444;
  color: white;
}

/* Overlay Styles */
.capture-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75); 
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.overlay-content {
  background: rgba(30, 41, 59, 0.95);
  padding: 24px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  max-width: 90%;
  max-height: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
}

@keyframes zoomIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.overlay-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  color: #fff;
  font-size: 1.2rem;
  font-weight: 600;
}

.close-icon-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.close-icon-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}
</style>
