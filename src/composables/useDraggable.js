/**
 * Create draggable functionality for lines
 * @param {Ref} lines - Reactive lines array
 * @returns {Function} Function to handle drag mouse down
 */
export function useDraggable(lines) {
  let offsetX = 0;
  let offsetY = 0;

  /**
   * Handle mouse down for dragging
   * @param {number} index - Index of the line
   * @param {Event} e - Mouse event
   */
  function dragMouseDown(index, e) {
    e.preventDefault(); // Prevents text selection during drag
    
    const line = lines.value[index];
    const onMove = (moveEvent) => {
      if (!line.dragging) return;
      line.x = moveEvent.clientX - offsetX;
      line.y = moveEvent.clientY - offsetY;
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    if (line.dragging) {
      line.dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      return;
    }

    line.dragging = true;
    offsetX = e.clientX - line.x;
    offsetY = e.clientY - line.y;
    
    // Added { passive: false } to help with smoothness on high-refresh screens
    document.addEventListener("mousemove", onMove, { passive: false });
    document.addEventListener("mouseup", onUp, { passive: false });
  }

  return { dragMouseDown };
}
