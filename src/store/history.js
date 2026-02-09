// store/history.js
import { reactive } from "vue";

export const historyStore = reactive({
  captures: [],

  addCapture(capture) {
    this.captures.unshift(capture);
  },
  clearCaptures() {
    this.captures.length = 0;
  },
});
