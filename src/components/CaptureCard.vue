<!-- components/CaptureCard.vue -->
<template>
  <div class="capture-card-container">
    <!-- Main Content: Side-by-Side Layout -->
    <div class="side-by-side-wrapper">
      
      <!-- Left: Captured Image (Fixed, No Scroll) -->
      <div class="image-section">
        <img :src="capture.image" class="capture-image" />
      </div>

      <!-- Right: Translation Lines List (Scrollable) -->
      <div class="lines-section">
        <div v-if="capture.lines && capture.lines.length > 0" class="lines-list">
          <div 
            v-for="(line, index) in capture.lines" 
            :key="index" 
            class="line-item"
          >
            <div class="line-text" :title="line.originalText">
              {{ line.text }}
            </div>
            <div class="line-original">
              {{ line.originalText }}
            </div>
          </div>
        </div>
        <div v-else class="empty-lines">
          No text data available.
        </div>
      </div>

    </div>

    <div class="meta">
      {{ new Date(capture.timestamp).toLocaleString() }}
    </div>
  </div>
</template>

<script setup>
defineProps({ capture: Object });
</script>

<style>
.capture-card-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #f1f5f9;
}

/* Flex container for side-by-side view */
.side-by-side-wrapper {
  display: flex;
  gap: 20px;
  align-items: stretch; /* Stretch children to full height of wrapper */
  
  /* Define the scroll boundary */
  max-height: 65vh; 
  overflow: hidden; /* Prevents outer scrolling */
}

/* Left Side: Image */
.image-section {
  flex: 0 0 auto; /* Don't shrink the image */
  max-width: 50%;
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Align to top */
  border-radius: 8px;
  overflow: hidden; /* Clips image if it exceeds the wrapper height */
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.capture-image {
  display: block;
  max-width: 100%;
  height: auto;
  /* Removed max-height constraint relative to viewport, 
     letting it fit within the flex container naturally */
}

/* Right Side: Lines */
.lines-section {
  flex: 1; /* Take remaining space */
  display: flex;
  flex-direction: column;
  
  /* Essential CSS for scrolling inside a flex item */
  min-height: 0; 
  overflow-y: auto; 
  
  padding-right: 5px;
  min-width: 250px; /* Ensure it has enough width */
}

/* Custom Scrollbar for Lines */
.lines-section::-webkit-scrollbar {
  width: 6px;
}
.lines-section::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}
.lines-section::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.lines-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 10px; /* Space at bottom for scroll */
}

.line-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 10px;
  border-radius: 6px;
  transition: background 0.2s;
}

.line-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.line-text {
  /* Google Lens Style for the text */
  background-color: #ffffff;
  color: #202124;
  padding: 6px 10px;
  border-radius: 4px;
  
  border: 1px solid #dadce0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  
  font-family: 'Roboto', 'Arial', sans-serif;
  font-size: 14px;
  line-height: 1.4;
  font-weight: 500;
  margin-bottom: 6px;
}

.line-original {
  font-size: 12px;
  color: #94a3b8;
  font-family: monospace;
  word-break: break-all;
}

.empty-lines {
  color: #64748b;
  font-style: italic;
  text-align: center;
  padding: 20px;
}

.meta {
  font-size: 12px;
  color: #64748b;
  text-align: right;
  margin-top: 5px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
}
</style>
