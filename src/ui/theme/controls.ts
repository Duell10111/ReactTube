/**
 * Geometry of an interactive control. Typography already switches between a
 * touch and a TV scale; the controls around it did not, so a 48 point button
 * with a 24 point icon stayed the same physical size on a screen viewed from
 * ten feet away, next to text that had grown by half.
 */
export interface ControlMetrics {
  /** Smallest edge of a control: a touch target, or a focus target on TV. */
  minTarget: number;
  /** Icon size inside a control. */
  iconSize: number;
  /**
   * Width of the focus outline. It is reserved in every state so gaining focus
   * never changes a control's size.
   */
  focusBorderWidth: number;
}

export const touchControlMetrics: ControlMetrics = {
  minTarget: 48,
  iconSize: 24,
  focusBorderWidth: 3,
};

export const tvControlMetrics: ControlMetrics = {
  minTarget: 64,
  iconSize: 36,
  focusBorderWidth: 4,
};

export function getControlMetrics(isTV: boolean): ControlMetrics {
  return isTV ? tvControlMetrics : touchControlMetrics;
}
