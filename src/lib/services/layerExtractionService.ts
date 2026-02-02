import { addElement, resetElementsStore, setMainImage } from '$lib/stores/elementsStore';
import { setCanvasImage } from '$lib/stores/canvasTransformStore';

const MAX_EXTRACTED = 12;

/**
 * Creates a prompt to identify important visual elements from the image
 * (prioritized by significance, up to 10 images max + background + text).
 */
export function createLayerExtractionPrompt(): string {
  return `Identify the most important visual elements in this image that have distinct visual meaning. Prioritize by significance. Return up to 10 image regions, plus background and text layers. Maximum ${MAX_EXTRACTED} elements total.`;
}

export interface ExtractedLayer {
  type: 'image' | 'text' | 'background';
  imageUrl: string;
  textContent: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  significance?: number;
}

/**
 * Extract layers from main image URL using LLM vision (POST /api/extract-layers).
 * Returns distinct cropped regions and text overlays from the full image.
 */
export async function extractLayers(mainImageUrl: string): Promise<ExtractedLayer[]> {
  const res = await fetch('/api/extract-layers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl: mainImageUrl })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? `Extract layers failed: ${res.status}`);
  }
  const data = (await res.json()) as { layers: ExtractedLayer[] };
  return data.layers ?? [];
}

/**
 * Apply extracted layers to stores: set main image and populate elementList (up to 12).
 */
export async function applyExtractedLayers(mainImageUrl: string): Promise<void> {
  resetElementsStore();
  setMainImage(mainImageUrl);
  setCanvasImage(mainImageUrl);
  const layers = await extractLayers(mainImageUrl);
  for (const layer of layers) {
    addElement({
      type: layer.type === 'text' ? 'text' : 'image',
      imageUrl: layer.imageUrl,
      originalImageUrl: layer.imageUrl,
      textContent: layer.textContent,
      boundingBox: layer.boundingBox,
      position: { x: layer.boundingBox.x, y: layer.boundingBox.y }
    });
  }
}
