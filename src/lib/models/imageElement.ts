export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export type ElementType = 'image' | 'text';

export interface ImageElement {
  id: string;
  type: ElementType;
  boundingBox: BoundingBox;
  imageUrl: string;
  /** Original image URL when layer was extracted; used for Reset layer. */
  originalImageUrl?: string | null;
  textContent: string;
  color: string;
  zIndex: number;
  opacity: number;
  rotation: number;
  scale: number;
  position: Position;
  /** Text overlay: font size (px). */
  fontSize?: number;
  /** Text overlay: font family. */
  fontFamily?: string;
}

export function createEmptyBoundingBox(): BoundingBox {
  return { x: 0, y: 0, width: 0, height: 0 };
}

export function createEmptyPosition(): Position {
  return { x: 0, y: 0 };
}
