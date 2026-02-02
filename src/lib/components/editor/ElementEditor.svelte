<script lang="ts">
  import {
    elementsStore,
    updateElement,
    removeElement,
    setSelectedElement
  } from '$lib/stores/elementsStore';
  import { addEditInstruction } from '$lib/stores/sessionHistoryStore';

  $: selectedId = $elementsStore.selectedElement;
  $: selectedElement = selectedId
    ? $elementsStore.elementList.find((el) => el.id === selectedId)
    : null;

  let removingBg = false;
  let removeBgError = '';

  async function handleRemoveBackground() {
    if (!selectedId || !selectedElement || selectedElement.type !== 'image' || !selectedElement.imageUrl) return;
    removingBg = true;
    removeBgError = '';
    try {
      const res = await fetch('/api/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: selectedElement.imageUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Remove background failed');
      updateElement(selectedId, { imageUrl: (data as { imageUrl: string }).imageUrl });
      addEditInstruction('Removed background from selected layer');
    } catch (e) {
      removeBgError = e instanceof Error ? e.message : 'Remove background failed';
    } finally {
      removingBg = false;
    }
  }

  function handleColorInput(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    if (selectedId) updateElement(selectedId, { color: value });
  }

  function handleOpacityInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value) / 100;
    if (selectedId) updateElement(selectedId, { opacity: value });
  }

  function handleRotationInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    if (selectedId) updateElement(selectedId, { rotation: value });
  }

  function handleZoomInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value) / 100;
    if (selectedId) updateElement(selectedId, { scale: value });
  }

  function handleDelete() {
    if (selectedId) {
      removeElement(selectedId);
      setSelectedElement(null);
    }
  }

  function handleFontSizeInput(e: Event) {
    const value = Number((e.target as HTMLInputElement).value);
    if (selectedId) updateElement(selectedId, { fontSize: value });
  }

  function handleFontFamilyInput(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    if (selectedId) updateElement(selectedId, { fontFamily: value });
  }

  function handleResetLayer() {
    if (!selectedId || !selectedElement || selectedElement.type !== 'image' || !selectedElement.originalImageUrl) return;
    updateElement(selectedId, { imageUrl: selectedElement.originalImageUrl });
    addEditInstruction('Layer reset to original');
  }
</script>

{#if selectedElement}
  <div
    class="box-card flex flex-col gap-4"
    role="form"
    aria-label="Edit selected element"
  >
    <h4 class="text-sm font-medium text-slate-800 dark:text-slate-200">Edit element</h4>

    <div>
      <label for="element-color" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
        Tint
      </label>
      <div class="flex items-center gap-2">
        <input
          id="element-color"
          type="color"
          value={selectedElement.color}
          class="h-9 w-14 cursor-pointer border border-slate-300 bg-transparent p-0 dark:border-slate-600"
          on:input={handleColorInput}
        />
        <span class="text-xs text-slate-500 dark:text-slate-400">{selectedElement.color}</span>
      </div>
    </div>

    <div>
      <label for="element-opacity" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
        Opacity
      </label>
      <div class="flex items-center gap-2">
        <input
          id="element-opacity"
          type="range"
          min="0"
          max="100"
          value={Math.round(selectedElement.opacity * 100)}
          class="h-2 flex-1 accent-sky-600 dark:accent-sky-500"
          on:input={handleOpacityInput}
        />
        <span class="min-w-[2.5rem] text-right text-xs text-slate-600 dark:text-slate-400">
          {Math.round(selectedElement.opacity * 100)}%
        </span>
      </div>
    </div>

    <div>
      <label for="element-rotate" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
        Rotate
      </label>
      <div class="flex items-center gap-2">
        <input
          id="element-rotate"
          type="range"
          min="-180"
          max="180"
          value={selectedElement.rotation}
          class="h-2 flex-1 accent-sky-600 dark:accent-sky-500"
          on:input={handleRotationInput}
        />
        <span class="min-w-[3rem] text-right text-xs text-slate-600 dark:text-slate-400">
          {selectedElement.rotation}°
        </span>
      </div>
    </div>

    <div>
      <label for="element-zoom" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
        Zoom
      </label>
      <div class="flex items-center gap-2">
        <input
          id="element-zoom"
          type="range"
          min="25"
          max="300"
          value={Math.round(selectedElement.scale * 100)}
          class="h-2 flex-1 accent-sky-600 dark:accent-sky-500"
          on:input={handleZoomInput}
        />
        <span class="min-w-[3rem] text-right text-xs text-slate-600 dark:text-slate-400">
          {Math.round(selectedElement.scale * 100)}%
        </span>
      </div>
    </div>

    {#if selectedElement.type === 'image' && selectedElement.imageUrl}
      <div class="space-y-3">
        <div class="flex flex-col gap-2">
          <button
            type="button"
            class="box-btn-secondary w-full"
            on:click={handleRemoveBackground}
            disabled={removingBg}
          >
            {removingBg ? 'Removing background…' : 'Remove background'}
          </button>
          {#if selectedElement.originalImageUrl && selectedElement.originalImageUrl !== selectedElement.imageUrl}
            <button
              type="button"
              class="box-btn-secondary w-full border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/50"
              on:click={handleResetLayer}
            >
              Reset layer
            </button>
          {/if}
          {#if removeBgError}
            <p class="text-xs text-red-600 dark:text-red-400">{removeBgError}</p>
          {/if}
        </div>
      </div>
    {/if}

    {#if selectedElement.type === 'text'}
      <div>
        <label for="element-font-size" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Font size
        </label>
        <div class="flex items-center gap-2">
          <input
            id="element-font-size"
            type="range"
            min="8"
            max="72"
            value={selectedElement.fontSize ?? 16}
            class="h-2 flex-1 accent-sky-600 dark:accent-sky-500"
            on:input={handleFontSizeInput}
          />
          <span class="min-w-[2rem] text-right text-xs text-slate-600 dark:text-slate-400">
            {selectedElement.fontSize ?? 16}px
          </span>
        </div>
      </div>
      <div>
        <label for="element-font-family" class="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
          Font type
        </label>
        <select
          id="element-font-family"
          class="box-input"
          value={selectedElement.fontFamily ?? 'sans-serif'}
          on:change={handleFontFamilyInput}
        >
          <option value="sans-serif">Sans-serif</option>
          <option value="serif">Serif</option>
          <option value="monospace">Monospace</option>
        </select>
      </div>
    {/if}

    <button
      type="button"
      class="mt-2 border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
      on:click={handleDelete}
    >
      Delete
    </button>
  </div>
{:else}
  <div class="border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
    Select an element to edit
  </div>
{/if}
