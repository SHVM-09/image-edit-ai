<script lang="ts">
  import {
    canvasTransformStore,
    setCanvasPosition,
    setCanvasScale,
    setCanvasRotation,
    setCanvasOpacity
  } from '$lib/stores/canvasTransformStore';
  import { elementsStore } from '$lib/stores/elementsStore';

  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStoreX = 0;
  let dragStoreY = 0;

  /** When we have layers: show only the selected item (main image or one layer). No overlay; main only when "Main image" is selected. */
  $: hasLayers = $elementsStore.elementList.length > 0;
  $: selectedId = $elementsStore.selectedElement;
  $: selectedEl = selectedId
    ? $elementsStore.elementList.find((el) => el.id === selectedId)
    : null;
  /** Single item to display: main image when no layers, or when main selected; otherwise the selected layer only. */
  $: displayMainOnly = !hasLayers || selectedId === null;
  $: baseImageUrl = displayMainOnly
    ? (hasLayers ? $elementsStore.mainImage : $canvasTransformStore.imageUrl)
    : (selectedEl?.type === 'image' && selectedEl?.imageUrl ? selectedEl.imageUrl : null);
  /** For layer-only view (selected element is text): we show a text card. */
  $: displayTextContent = !displayMainOnly && selectedEl?.type === 'text';

  /** Canvas toolbar is display-only: controls viewport (pan/zoom), not layer edits. Edit layers in the right panel only. */
  function handleZoomIn() {
    setCanvasScale(Math.min(3, $canvasTransformStore.scale + 0.25));
  }

  function handleZoomOut() {
    setCanvasScale(Math.max(0.25, $canvasTransformStore.scale - 0.25));
  }

  function handleRotateLeft() {
    setCanvasRotation($canvasTransformStore.rotation - 90);
  }

  function handleRotateRight() {
    setCanvasRotation($canvasTransformStore.rotation + 90);
  }

  function handleOpacityInput(e: Event) {
    const val = Number((e.target as HTMLInputElement).value) / 100;
    setCanvasOpacity(val);
  }

  function handlePointerDown(e: PointerEvent) {
    if (!baseImageUrl && !displayTextContent) return;
    dragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStoreX = $canvasTransformStore.x;
    dragStoreY = $canvasTransformStore.y;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!dragging) return;
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    setCanvasPosition(dragStoreX + dx, dragStoreY + dy);
  }

  function handlePointerUp(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  $: transformStyle = `translate(-50%, -50%) translate(${$canvasTransformStore.x}px, ${$canvasTransformStore.y}px) scale(${$canvasTransformStore.scale}) rotate(${$canvasTransformStore.rotation}deg)`;
  /** When showing a layer, apply the element's transforms so manual edits (opacity, rotate, zoom) are visible. */
  $: showingLayer = hasLayers && selectedEl && !displayMainOnly;
  $: layerOpacity = showingLayer && selectedEl ? selectedEl.opacity : $canvasTransformStore.opacity;
  $: layerTransform = showingLayer && selectedEl
    ? `rotate(${selectedEl.rotation}deg) scale(${selectedEl.scale})`
    : '';
  /** Toolbar shows viewport scale/opacity (canvas is for display only; edit layers in right panel). */
  $: displayScale = $canvasTransformStore.scale;
  $: displayOpacity = $canvasTransformStore.opacity;
</script>

<div class="flex h-full min-h-0 flex-col border-r border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
  <div
    class="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
    role="toolbar"
    aria-label="Canvas controls"
  >
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Zoom out"
        on:click={handleZoomOut}
      >
        −
      </button>
      <span class="min-w-[2.5rem] text-center text-sm font-medium text-slate-700 dark:text-slate-200">
        {Math.round(displayScale * 100)}%
      </span>
      <button
        type="button"
        class="border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Zoom in"
        on:click={handleZoomIn}
      >
        +
      </button>
    </div>
    <div class="h-5 w-px bg-slate-300 dark:bg-slate-600" aria-hidden="true"></div>
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Rotate left"
        on:click={handleRotateLeft}
      >
        ↶
      </button>
      <button
        type="button"
        class="border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        aria-label="Rotate right"
        on:click={handleRotateRight}
      >
        ↷
      </button>
    </div>
    <div class="h-5 w-px bg-slate-300 dark:bg-slate-600" aria-hidden="true"></div>
    <div class="flex items-center gap-2">
      <label for="canvas-opacity" class="text-sm font-medium text-slate-700 dark:text-slate-200">Opacity</label>
      <input
        id="canvas-opacity"
        type="range"
        min="0"
        max="100"
        value={Math.round(displayOpacity * 100)}
        class="h-2 w-24 accent-sky-600 dark:accent-sky-500"
        on:input={handleOpacityInput}
        title="Viewport opacity (edit layer opacity in right panel)"
      />
      <span class="min-w-[2.5rem] text-sm text-slate-600 dark:text-slate-400">
        {Math.round(displayOpacity * 100)}%
      </span>
    </div>
  </div>

  <div
    class="relative flex-1 min-h-0 overflow-hidden border border-t-0 border-slate-200 bg-slate-300 dark:border-slate-700 dark:bg-slate-800"
    role="img"
    aria-label="Image canvas"
  >
    {#if baseImageUrl}
      <div
        class="absolute left-1/2 top-1/2 cursor-grab select-none touch-none"
        style="transform: {transformStyle}; transform-origin: center;"
        role="presentation"
        on:pointerdown={handlePointerDown}
        on:pointermove={handlePointerMove}
        on:pointerup={handlePointerUp}
        on:pointerleave={handlePointerUp}
        on:pointercancel={handlePointerUp}
        class:grabbing={dragging}
      >
        <div class="relative inline-block" style="transform: {layerTransform}; transform-origin: center;">
          <img
            src={baseImageUrl}
            alt=""
            class="block max-w-none select-none touch-none"
            style="opacity: {layerOpacity};"
            draggable="false"
          />
          {#if showingLayer && selectedEl && selectedEl.color && selectedEl.color !== '#000000'}
            <div
              class="pointer-events-none absolute inset-0 mix-blend-multiply"
              style="background-color: {selectedEl.color}; opacity: 0.4;"
              aria-hidden="true"
            ></div>
          {/if}
        </div>
      </div>
    {:else if displayTextContent && selectedEl}
      <div
        class="absolute left-1/2 top-1/2 cursor-grab select-none touch-none -translate-x-1/2 -translate-y-1/2 border border-slate-400 bg-white/95 px-6 py-4 shadow-lg dark:border-slate-500 dark:bg-slate-800/95"
        style="
          color: {selectedEl.color};
          font-size: {selectedEl.fontSize ?? 16}px;
          font-family: {selectedEl.fontFamily ?? 'sans-serif'};
          opacity: {selectedEl.opacity};
          transform: {transformStyle} rotate({selectedEl.rotation}deg) scale({selectedEl.scale});
        "
        role="presentation"
        on:pointerdown={handlePointerDown}
        on:pointermove={handlePointerMove}
        on:pointerup={handlePointerUp}
        on:pointerleave={handlePointerUp}
        on:pointercancel={handlePointerUp}
        class:grabbing={dragging}
      >
        {selectedEl.textContent || 'Text'}
      </div>
    {:else}
      <div
        class="absolute inset-0 flex items-center justify-center text-slate-500 dark:text-slate-400"
        aria-hidden="true"
      >
        <p class="text-sm">
          {hasLayers && selectedId
            ? 'This layer has no image to display.'
            : 'No image — generate or load one to edit'}
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .grabbing {
    cursor: grabbing;
  }
</style>
