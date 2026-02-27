// src/store/ui.js
import { reactive } from "vue";

export const uiStore = reactive({
  view: "overlay", // 'overlay' | 'history'
  loading: {
    active: false,
    step: '', // 'capturing' | 'ocr' | 'translation'
    message: ''
  },

  toggleView() {
    this.view = this.view === "overlay" ? "history" : "overlay";
  },

  showOverlay() {
    this.view = "overlay";
  },

  showHistory() {
    this.view = "history";
  },

  setLoading(step, message = '') {
    this.loading.active = true;
    this.loading.step = step;
    this.loading.message = message;
  },

  clearLoading() {
    this.loading.active = false;
    this.loading.step = '';
    this.loading.message = '';
  },
});
