<script lang="ts">
  import { elementsStore, getElementById, updateElement } from '$lib/stores/elementsStore';
  import { promptUsed, editHistory } from '$lib/stores/sessionHistoryStore';
  import { addEditInstruction } from '$lib/stores/sessionHistoryStore';

  let error: string | null = null;
  let layerEditInstruction = '';
  let editingLayer = false;

  async function applyEditToSelectedLayer() {
    const selectedId = $elementsStore.selectedElement;
    const el = selectedId ? getElementById(selectedId) : null;
    if (!el || el.type !== 'image' || !el.imageUrl || !layerEditInstruction.trim()) {
      error = 'Select an image layer (left panel) and enter an edit instruction.';
      return;
    }
    editingLayer = true;
    error = null;
    try {
      const res = await fetch('/api/edit-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: el.imageUrl,
          editInstruction: layerEditInstruction.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Edit failed');
      const imageUrl = (data as { imageUrl: string }).imageUrl;
      updateElement(selectedId!, { imageUrl });
      addEditInstruction(layerEditInstruction.trim());
      layerEditInstruction = '';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Layer edit failed';
    } finally {
      editingLayer = false;
    }
  }

  $: selectedId = $elementsStore.selectedElement;
  $: selectedElement = selectedId ? getElementById(selectedId) : null;
  $: canEditLayer = selectedElement?.type === 'image' && selectedElement?.imageUrl;
</script>

<div class="flex h-full flex-col border-l border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
  <div class="box-card mb-3 shrink-0">
    <h4 class="mb-2 text-xs font-medium text-slate-700 dark:text-slate-200">Edit selected layer (LLM)</h4>
    <p class="mb-2 text-xs text-slate-500 dark:text-slate-400">
      {#if canEditLayer}
        Only the selected layer will be updated. Type an instruction (e.g. "make it brighter", "add a shadow").
      {:else}
        Select an image layer in the left panel to edit it here.
      {/if}
    </p>
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={layerEditInstruction}
        placeholder="e.g. make it brighter, add shadow"
        class="box-input min-w-0 flex-1 py-2"
        disabled={!canEditLayer || editingLayer}
      />
      <button
        type="button"
        class="box-btn-primary shrink-0 disabled:opacity-50"
        disabled={!canEditLayer || !layerEditInstruction.trim() || editingLayer}
        on:click={applyEditToSelectedLayer}
      >
        {editingLayer ? 'Updating…' : 'Apply'}
      </button>
    </div>
  </div>

  {#if error}
    <p class="mb-2 text-xs text-red-600 dark:text-red-400">{error}</p>
  {/if}

  <div class="box-card mb-3 shrink-0">
    <h4 class="mb-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">Generated prompt (from LLM)</h4>
    <div class="max-h-32 overflow-y-auto border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700 whitespace-pre-wrap dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
      {$promptUsed || 'No prompt yet. Generate an image in Step 2 to see the prompt used.'}
    </div>
  </div>

  <div class="box-card min-h-0 flex-1 flex flex-col overflow-hidden">
    <h4 class="mb-1.5 shrink-0 text-xs font-medium text-slate-700 dark:text-slate-200">History for this image</h4>
    <ul class="min-h-0 flex-1 list-inside list-disc space-y-0.5 overflow-y-auto border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
      {#if $editHistory.length === 0}
        <li class="list-none text-slate-500 dark:text-slate-400">No edits yet. Layer edits, crops, and resets will appear here.</li>
      {:else}
        {#each $editHistory as change}
          <li>{change}</li>
        {/each}
      {/if}
    </ul>
  </div>
</div>
