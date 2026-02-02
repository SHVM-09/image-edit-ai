<script lang="ts">
  import { elementsStore, setSelectedElement, reorderElement } from '$lib/stores/elementsStore';
  import { addEditInstruction } from '$lib/stores/sessionHistoryStore';

  const MAX_ELEMENTS = 12;

  $: displayedElements = $elementsStore.elementList.slice(0, MAX_ELEMENTS);

  function selectElement(id: string) {
    setSelectedElement(id);
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    reorderElement(index, index - 1);
    addEditInstruction('Layer moved up');
  }

  function moveDown(index: number) {
    if (index >= $elementsStore.elementList.length - 1) return;
    reorderElement(index, index + 1);
    addEditInstruction('Layer moved down');
  }
</script>

<div class="flex h-full flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
  <h3 class="mb-3 text-sm font-medium text-slate-800 dark:text-slate-200">Elements</h3>
  <ul class="flex flex-col gap-2">
    {#if $elementsStore.elementList.length > 0}
      <li class="flex items-center gap-1">
        <button
          type="button"
          class="flex flex-1 items-center gap-3 border p-2 text-left transition-colors {$elementsStore.selectedElement === null
            ? 'border-sky-500 bg-sky-100 ring-2 ring-sky-500 dark:border-sky-400 dark:bg-sky-900/50 dark:ring-sky-400'
            : 'border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700'}"
          on:click={() => setSelectedElement(null)}
        >
          <div
            class="h-12 w-12 shrink-0 overflow-hidden border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700"
            aria-hidden="true"
          >
            {#if $elementsStore.mainImage}
              <img
                src={$elementsStore.mainImage}
                alt=""
                class="h-full w-full object-cover"
              />
            {:else}
              <div class="flex h-full w-full items-center justify-center text-lg text-slate-400" aria-hidden="true">BG</div>
            {/if}
          </div>
          <div class="min-w-0 flex-1">
            <span class="block truncate text-xs font-medium text-slate-700 dark:text-slate-200">Main image</span>
            <span class="block truncate text-xs text-slate-500 dark:text-slate-400">Background / full image</span>
          </div>
          <span class="shrink-0 border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-600 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300">Select</span>
        </button>
      </li>
    {/if}
    {#each displayedElements as element, index (element.id)}
      <li class="flex items-center gap-1">
        <div class="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            class="border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-600"
            aria-label="Move up"
            disabled={index === 0}
            on:click|stopPropagation={() => moveUp(index)}
          >
            ↑
          </button>
          <button
            type="button"
            class="border border-slate-300 p-0.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-600"
            aria-label="Move down"
            disabled={index >= $elementsStore.elementList.length - 1}
            on:click|stopPropagation={() => moveDown(index)}
          >
            ↓
          </button>
        </div>
        <button
          type="button"
          class="flex flex-1 items-center gap-3 border p-2 text-left transition-colors {element.id === $elementsStore.selectedElement
            ? 'border-sky-500 bg-sky-100 ring-2 ring-sky-500 dark:border-sky-400 dark:bg-sky-900/50 dark:ring-sky-400'
            : 'border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700'}"
          on:click={() => selectElement(element.id)}
        >
          <div
            class="h-12 w-12 shrink-0 overflow-hidden border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-700"
            aria-hidden="true"
          >
            {#if element.type === 'image' && element.imageUrl}
              <img
                src={element.imageUrl}
                alt=""
                class="h-full w-full object-cover"
              />
            {:else}
              <div
                class="flex h-full w-full items-center justify-center text-lg font-medium text-slate-400"
                aria-hidden="true"
              >
                {element.type === 'text' ? 'T' : '—'}
              </div>
            {/if}
          </div>
          <div class="min-w-0 flex-1">
            <span class="block truncate text-xs font-medium capitalize text-slate-700 dark:text-slate-200">
              {element.type}
            </span>
            {#if element.type === 'text' && element.textContent}
              <span class="block truncate text-xs text-slate-500 dark:text-slate-400">
                {element.textContent}
              </span>
            {/if}
          </div>
          <span
            class="shrink-0 border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-600 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300"
            aria-label="Select element"
          >
            Select
          </span>
        </button>
      </li>
    {:else}
      <li class="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        No elements yet
      </li>
    {/each}
  </ul>
  {#if $elementsStore.elementList.length > MAX_ELEMENTS}
    <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
      Showing first {MAX_ELEMENTS} of {$elementsStore.elementList.length}
    </p>
  {/if}
</div>
