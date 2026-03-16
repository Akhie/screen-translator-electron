<script setup>
import { computed } from 'vue';
import { uiStore } from '../store/ui';

const steps = [
  { id: 'capturing', label: 'Capture', icon: '📷' },
  { id: 'ocr', label: 'OCR', icon: '🔍' },
  { id: 'translation', label: 'Translate', icon: '🌐' }
];

const currentStepIndex = computed(() => {
  return steps.findIndex(step => step.id === uiStore.loading.step);
});

const progressWidth = computed(() => {
  const index = currentStepIndex.value;
  if (index === -1) return 0;
  return (index / (steps.length - 1)) * 100;
});

const isStepCompleted = (stepId) => {
  const currentIndex = currentStepIndex.value;
  const stepIndex = steps.findIndex(step => step.id === stepId);
  return stepIndex < currentIndex;
};
</script>

<template>
  <div v-if="uiStore.loading.active" class="transversal-loader">
    <div class="loader-line">
      <div class="loader-progress" :style="{ width: progressWidth + '%' }"></div>
    </div>
    <div class="loader-steps">
      <div 
        v-for="(step, index) in steps" 
        :key="step.id"
        class="step-item"
        :class="{ 
          active: uiStore.loading.step === step.id,
          completed: isStepCompleted(step.id)
        }"
      >
        <div class="step-dot">{{ step.icon }}</div>
        <span class="step-label">{{ step.label }}</span>
      </div>
    </div>
  </div>
</template>

<style>
/* Transversal Loader */
.transversal-loader {
  position: fixed;
  bottom: 90px;
  right: 20px;
  z-index: 10002;
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: slideUp 0.3s ease-out;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loader-line {
  position: absolute;
  top: 50%;
  left: 28px;
  right: 28px;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-50%);
  z-index: 1;
  overflow: hidden;
}

.loader-progress {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 2px;
  transition: width 0.5s ease-in-out;
}

.loader-steps {
  display: flex;
  align-items: center;
  gap: 0;
  justify-content: space-between;
  position: relative;
  z-index: 2;
  padding: 0 8px;
  width: 220px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  background: rgba(30, 41, 59, 0.95);
  padding: 4px 6px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.step-item.completed .step-dot {
  background: rgba(34, 197, 94, 0.3);
  border-color: #22c55e;
}

.step-item.completed .step-label {
  color: #22c55e;
}

.step-item.active .step-dot {
  background: rgba(59, 130, 246, 0.3);
  border-color: #3b82f6;
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.5);
  animation: pulse 1.5s ease-in-out infinite;
}

.step-item.active .step-label {
  color: #60a5fa;
}

.step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.3s ease;
}

.step-label {
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  transition: color 0.3s ease;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}
</style>