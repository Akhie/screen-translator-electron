// src/store/ui.js
import { reactive } from "vue";

export const uiStore = reactive({
  view: "overlay", // 'overlay' | 'history'

  toggleView() {
    this.view = this.view === "overlay" ? "history" : "overlay";
  },

  showOverlay() {
    this.view = "overlay";
  },

  showHistory() {
    this.view = "history";
  },
});
