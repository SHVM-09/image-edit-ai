<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import {
    canvasTransformStore,
    setCanvasScale,
    setCanvasRotation,
    setCanvasOpacity,
    setCanvasImage,
    resetCanvasTransform
  } from '$lib/stores/canvasTransformStore';
  import {
    elementsStore,
    getElementById,
    updateElement,
    removeElement,
    setSelectedElement,
    setMainImage
  } from '$lib/stores/elementsStore';
  import { setStep } from '$lib/stores/appFlowStore';
  import { applyExtractedLayers } from '$lib/services/layerExtractionService';
  import { promptUsed, editHistory, addEditInstruction } from '$lib/stores/sessionHistoryStore';
  import HistoryPanel from './HistoryPanel.svelte';

  const dispatch = createEventDispatcher<{
    crop: void;
    save: void;
    version: void;
  }>();

  let showCropModal = false;
  let cropImageUrl = '';
  /** When set, crop applies to this layer; otherwise crop applies to main image. */
  let cropTargetLayerId: string | null = null;
  let cropLeft = 0;
  let cropTop = 0;
  let cropWidth = 1;
  let cropHeight = 1;
  let cropping = false;
  let cropError = '';
  let cropContainerRef: HTMLDivElement;
  let cropImgRef: HTMLImageElement;
  let cropNaturalW = 0;
  let cropNaturalH = 0;
  let cropContentLeft = 0;
  let cropContentTop = 0;
  let cropDisplayW = 0;
  let cropDisplayH = 0;
  let cropIsDrawing = false;
  let cropStartX = 0;
  let cropStartY = 0;

  let saving = false;
  let saveMessage = '';
  let lastSaveId: string | null = null;
  let versioning = false;
  let versionMessage = '';
  let lastVersionId: string | null = null;
  let showHistoryPanel = false;
  let showDownloadMenu = false;

  $: cropTargetEl = $elementsStore.selectedElement ? getElementById($elementsStore.selectedElement) : null;
  $: canCrop = $canvasTransformStore.imageUrl || (cropTargetEl?.type === 'image' && !!cropTargetEl?.imageUrl);

  function downloadStateAsJson(payload: { state: unknown; promptUsed?: string | null; editHistory?: string[] }, filename: string) {
    const json = JSON.stringify(
      {
        ...payload,
        exportedAt: new Date().toISOString()
      },
      null,
      2
    );
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadImageAsPng(dataUrl: string | null, filename: string) {
    if (!dataUrl || !dataUrl.startsWith('data:')) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  function handleDownloadCurrentState() {
    const canvas = get(canvasTransformStore);
    const elements = get(elementsStore);
    downloadStateAsJson(
      {
        state: { canvas, elements },
        promptUsed: $promptUsed,
        editHistory: $editHistory
      },
      `image-edit-state-${Date.now()}.json`
    );
  }

  function handleDownloadCurrentImage() {
    const mainImage = get(elementsStore).mainImage ?? get(canvasTransformStore).imageUrl;
    downloadImageAsPng(mainImage, `image-edit-${Date.now()}.png`);
  }

  function handleCrop() {
    const selectedId = get(elementsStore).selectedElement;
    const selectedEl = selectedId ? getElementById(selectedId) : null;
    const isLayerCrop = selectedEl?.type === 'image' && selectedEl?.imageUrl;
    if (isLayerCrop) {
      cropImageUrl = selectedEl.imageUrl;
      cropTargetLayerId = selectedId;
    } else {
      if (!$canvasTransformStore.imageUrl) return;
      cropImageUrl = $canvasTransformStore.imageUrl;
      cropTargetLayerId = null;
    }
    cropLeft = 0;
    cropTop = 0;
    cropWidth = 1;
    cropHeight = 1;
    cropError = '';
    showCropModal = true;
  }

  function onCropImageLoad() {
    if (!cropImgRef || !cropContainerRef) return;
    cropNaturalW = cropImgRef.naturalWidth;
    cropNaturalH = cropImgRef.naturalHeight;
    const cw = cropContainerRef.clientWidth;
    const ch = cropContainerRef.clientHeight;
    const scale = Math.min(cw / cropNaturalW, ch / cropNaturalH);
    cropDisplayW = cropNaturalW * scale;
    cropDisplayH = cropNaturalH * scale;
    cropContentLeft = (cw - cropDisplayW) / 2;
    cropContentTop = (ch - cropDisplayH) / 2;
  }

  function clientToNorm(clientX: number, clientY: number): [number, number] {
    const rect = cropContainerRef?.getBoundingClientRect();
    if (!rect || cropDisplayW <= 0 || cropDisplayH <= 0) return [0, 0];
    const x = clientX - rect.left - cropContentLeft;
    const y = clientY - rect.top - cropContentTop;
    const nx = Math.max(0, Math.min(1, x / cropDisplayW));
    const ny = Math.max(0, Math.min(1, y / cropDisplayH));
    return [nx, ny];
  }

  function handleCropPointerDown(e: PointerEvent) {
    if (!cropImgRef || cropping) return;
    const [nx, ny] = clientToNorm(e.clientX, e.clientY);
    cropIsDrawing = true;
    cropStartX = nx;
    cropStartY = ny;
    cropLeft = nx;
    cropTop = ny;
    cropWidth = 0.01;
    cropHeight = 0.01;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function handleCropPointerMove(e: PointerEvent) {
    if (!cropIsDrawing || cropping) return;
    const [nx, ny] = clientToNorm(e.clientX, e.clientY);
    const left = Math.min(cropStartX, nx);
    const top = Math.min(cropStartY, ny);
    const right = Math.max(cropStartX, nx);
    const bottom = Math.max(cropStartY, ny);
    cropLeft = left;
    cropTop = top;
    cropWidth = Math.max(0.01, right - left);
    cropHeight = Math.max(0.01, bottom - top);
  }

  function handleCropPointerUp(e: PointerEvent) {
    if (cropIsDrawing) {
      cropIsDrawing = false;
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  }

  async function applyCrop() {
    const imageUrl = cropImageUrl;
    if (!imageUrl) return;
    cropping = true;
    cropError = '';
    try {
      const res = await fetch('/api/crop-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          left: cropLeft,
          top: cropTop,
          width: cropWidth,
          height: cropHeight
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Crop failed');
      const newUrl = (data as { imageUrl: string }).imageUrl;
      if (newUrl) {
        if (cropTargetLayerId) {
          updateElement(cropTargetLayerId, { imageUrl: newUrl });
          addEditInstruction('Cropped selected layer');
        } else {
          setCanvasImage(newUrl);
          setMainImage(newUrl);
          dispatch('crop');
        }
        showCropModal = false;
        cropTargetLayerId = null;
      }
    } catch (e) {
      cropError = e instanceof Error ? e.message : 'Crop failed';
    } finally {
      cropping = false;
    }
  }

  let resettingLayers = false;
  async function handleResetAllLayers() {
    const mainImage = get(elementsStore).mainImage;
    if (!mainImage) return;
    resettingLayers = true;
    try {
      await applyExtractedLayers(mainImage);
      addEditInstruction('All layers reset (re-extracted)');
    } finally {
      resettingLayers = false;
    }
  }

  let extracting = false;
  async function handleExtractLayers() {
    const url = get(canvasTransformStore).imageUrl;
    if (!url) return;
    extracting = true;
    try {
      await applyExtractedLayers(url);
      setStep(4);
    } finally {
      extracting = false;
    }
  }

  let recomposing = false;
  async function handleRecompose() {
    const { mainImage, elementList } = get(elementsStore);
    if (!mainImage || elementList.length === 0) return;
    recomposing = true;
    try {
      const res = await fetch('/api/recompose-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainImageUrl: mainImage,
          elements: elementList
            .filter((el) => el.type === 'image' && el.imageUrl)
            .map((el) => ({
              imageUrl: el.imageUrl,
              boundingBox: el.boundingBox,
              opacity: el.opacity,
              rotation: el.rotation,
              scale: el.scale,
              zIndex: el.zIndex
            }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Recompose failed');
      const imageUrl = (data as { imageUrl: string }).imageUrl;
      setCanvasImage(imageUrl);
      setMainImage(imageUrl);
    } catch (e) {
      console.error('Recompose failed:', e);
    } finally {
      recomposing = false;
    }
  }

  function handleZoom() {
    const canvas = get(canvasTransformStore);
    setCanvasScale(Math.min(3, canvas.scale + 0.25));
    const sid = get(elementsStore).selectedElement;
    if (sid) {
      const el = getElementById(sid);
      if (el) updateElement(sid, { scale: Math.min(3, el.scale + 0.25) });
    }
  }

  function handleRotate() {
    const canvas = get(canvasTransformStore);
    setCanvasRotation(canvas.rotation + 90);
    const sid = get(elementsStore).selectedElement;
    if (sid) {
      const el = getElementById(sid);
      if (el) updateElement(sid, { rotation: el.rotation + 90 });
    }
  }

  function handleOpacity() {
    const canvas = get(canvasTransformStore);
    setCanvasOpacity(Math.max(0, canvas.opacity - 0.1));
    const sid = get(elementsStore).selectedElement;
    if (sid) {
      const el = getElementById(sid);
      if (el) updateElement(sid, { opacity: Math.max(0, el.opacity - 0.1) });
    }
  }

  function handleDelete() {
    const { selectedElement } = get(elementsStore);
    if (selectedElement) {
      removeElement(selectedElement);
      setSelectedElement(null);
    } else {
      setCanvasImage(null);
      setMainImage(null);
      resetCanvasTransform();
    }
  }

  async function handleSave() {
    saving = true;
    saveMessage = '';
    lastSaveId = null;
    try {
      const canvas = get(canvasTransformStore);
      const elements = get(elementsStore);
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: { canvas, elements },
          promptUsed: $promptUsed,
          editHistory: $editHistory
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Save failed');
      lastSaveId = (data as { id: string }).id;
      saveMessage = 'Saved';
      dispatch('save');
      setTimeout(() => {
        saveMessage = '';
        lastSaveId = null;
      }, 8000);
    } catch (e) {
      saveMessage = e instanceof Error ? e.message : 'Save failed';
    } finally {
      saving = false;
    }
  }

  async function handleVersion() {
    versioning = true;
    versionMessage = '';
    lastVersionId = null;
    try {
      const canvas = get(canvasTransformStore);
      const elements = get(elementsStore);
      const res = await fetch('/api/version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: { canvas, elements },
          promptUsed: $promptUsed,
          editHistory: $editHistory
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Version save failed');
      lastVersionId = (data as { id: string }).id;
      versionMessage = 'Version saved';
      dispatch('version');
      setTimeout(() => {
        versionMessage = '';
        lastVersionId = null;
      }, 8000);
    } catch (e) {
      versionMessage = e instanceof Error ? e.message : 'Version save failed';
    } finally {
      versioning = false;
    }
  }
</script>

<div
  class="flex h-[60px] shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900"
>
  <div class="flex items-center gap-3">
    <span class="text-sm font-medium text-slate-800 dark:text-slate-200">Image</span>
    <div
      class="h-9 w-14 shrink-0 overflow-hidden border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-700"
      aria-hidden="true"
    >
      {#if $canvasTransformStore.imageUrl}
        <img
          src={$canvasTransformStore.imageUrl}
          alt=""
          class="h-full w-full object-cover"
        />
      {/if}
    </div>
  </div>
  <div class="flex flex-1 items-center justify-center gap-2">
    <button
      type="button"
      class="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={handleCrop}
      disabled={!canCrop}
    >
      Crop
    </button>
    <button
      type="button"
      class="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={handleZoom}
    >
      Zoom
    </button>
    <button
      type="button"
      class="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={handleRotate}
    >
      Rotate
    </button>
    <button
      type="button"
      class="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={handleOpacity}
    >
      Opacity
    </button>
    <button
      type="button"
      class="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={handleDelete}
    >
      Delete
    </button>
    <button
      type="button"
      class="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={handleExtractLayers}
      disabled={!$canvasTransformStore.imageUrl || extracting}
    >
      Extract layers
    </button>
    <button
      type="button"
      class="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={handleResetAllLayers}
      disabled={!$elementsStore.mainImage || $elementsStore.elementList.length === 0 || resettingLayers}
    >
      {resettingLayers ? 'Resetting…' : 'Reset layers'}
    </button>
    <button
      type="button"
      class="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={handleRecompose}
      disabled={$elementsStore.elementList.length === 0 || !$elementsStore.mainImage || recomposing}
    >
      Recompose
    </button>
    <button
      type="button"
      class="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={handleSave}
      disabled={saving}
    >
      {saving ? 'Saving…' : 'Save'}
    </button>
    <button
      type="button"
      class="border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={handleVersion}
      disabled={versioning}
    >
      {versioning ? 'Saving…' : 'Version'}
    </button>
  </div>
  <div class="relative flex flex-wrap items-center gap-2">
    {#if saveMessage}
      <span class="text-xs font-medium text-green-600 dark:text-green-400">{saveMessage}</span>
    {/if}
    {#if versionMessage}
      <span class="text-xs font-medium text-green-600 dark:text-green-400">{versionMessage}</span>
    {/if}
    <div class="relative" data-download-menu>
      <button
        type="button"
        class="border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
        on:click={() => (showDownloadMenu = !showDownloadMenu)}
        disabled={!$canvasTransformStore.imageUrl && !$elementsStore.mainImage}
        title="Download"
      >
        Download ▾
      </button>
      {#if showDownloadMenu}
        <div
          class="absolute right-0 top-full z-50 mt-1 min-w-[10rem] border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-600 dark:bg-slate-800"
          role="menu"
          data-download-menu
        >
          <button
            type="button"
            class="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            role="menuitem"
            on:click={() => {
              handleDownloadCurrentState();
              showDownloadMenu = false;
            }}
          >
            State (JSON)
          </button>
          <button
            type="button"
            class="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            role="menuitem"
            on:click={() => {
              handleDownloadCurrentImage();
              showDownloadMenu = false;
            }}
          >
            Image (PNG)
          </button>
        </div>
      {/if}
    </div>
    <button
      type="button"
      class="border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
      on:click={() => (showHistoryPanel = true)}
    >
      History
    </button>
    <span class="text-sm font-medium text-slate-800 dark:text-slate-200">GenAI Chat</span>
  </div>
</div>

<svelte:window
  on:click={(e) => {
    if (showDownloadMenu && !(e.target as HTMLElement).closest('[data-download-menu]')) {
      showDownloadMenu = false;
    }
  }}
/>

{#if showCropModal}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="Crop image"
  >
    <div
      class="box-card w-full max-w-2xl border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800"
    >
      <h3 class="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{cropTargetLayerId ? 'Crop layer' : 'Crop image'}</h3>
      <p class="mb-3 text-xs text-slate-600 dark:text-slate-400">
        Drag on the image to draw a rectangle. The selected area will be cropped.
      </p>
      <div
        class="relative mx-auto mb-3 flex h-80 max-h-[60vh] w-full max-w-lg items-center justify-center overflow-hidden border border-slate-300 bg-slate-100 dark:border-slate-600 dark:bg-slate-700"
        bind:this={cropContainerRef}
        role="img"
        aria-label="Image to crop"
      >
        <img
          bind:this={cropImgRef}
          src={cropImageUrl}
          alt=""
          class="max-h-full max-w-full object-contain select-none"
          draggable="false"
          on:load={onCropImageLoad}
          on:pointerdown={handleCropPointerDown}
          on:pointermove={handleCropPointerMove}
          on:pointerup={handleCropPointerUp}
          on:pointerleave={handleCropPointerUp}
          on:pointercancel={handleCropPointerUp}
          style="touch-action: none;"
        />
        <div
          class="pointer-events-none absolute border border-sky-500 bg-sky-500/20 dark:border-sky-400 dark:bg-sky-400/20"
          style="left: {cropContentLeft + cropLeft * cropDisplayW}px; top: {cropContentTop + cropTop * cropDisplayH}px; width: {Math.max(2, cropWidth * cropDisplayW)}px; height: {Math.max(2, cropHeight * cropDisplayH)}px;"
          aria-hidden="true"
        ></div>
      </div>
      {#if cropError}
        <p class="mb-2 text-xs text-red-600 dark:text-red-400">{cropError}</p>
      {/if}
      <div class="flex gap-2">
        <button
          type="button"
          class="box-btn-primary flex-1"
          on:click={applyCrop}
          disabled={cropping}
        >
          {cropping ? 'Cropping…' : 'Apply crop'}
        </button>
        <button
          type="button"
          class="box-btn-secondary"
          on:click={() => (showCropModal = false)}
          disabled={cropping}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showHistoryPanel}
  <HistoryPanel open={showHistoryPanel} onClose={() => (showHistoryPanel = false)} />
{/if}
