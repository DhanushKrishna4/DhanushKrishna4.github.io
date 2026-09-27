/** Shared framing keeps the SVG and WebGL poses aligned at every breakpoint. */
export function sculptureLayout(viewportWidth: number, aspect: number) {
  if (viewportWidth <= 620) return { fit: 1.23, x: 0, y: 0.10 };
  // The status card remains visible on tablets. In portrait, leave space above
  // it; in landscape, reserve its column rather than drawing through its text.
  if (viewportWidth <= 1100) {
    if (aspect < 1.1) return { fit: 1.40, x: 0, y: 1.05 };
    return viewportWidth < 980
      ? { fit: 1.90, x: 1.55, y: 0.10 }
      : { fit: 1.78, x: 1.35, y: 0.10 };
  }
  return { fit: viewportWidth < 1360 ? 1.50 : 1.38, x: viewportWidth < 1360 ? 0.50 : 0.20, y: -0.02 };
}
