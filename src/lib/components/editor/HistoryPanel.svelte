<script lang="ts">
  import { canvasTransformStore } from '$lib/stores/canvasTransformStore';
  import { elementsStore } from '$lib/stores/elementsStore';

  export let open = false;
  export let onClose: () => void = () => {};

  interface SaveItem {
    id: string;
    createdAt: number;
    label: string | null;
    promptUsed: string | null;
    editHistory: string[] | null;
  }
  interface VersionItem {
    id: string;
    createdAt: number;
    promptUsed: string | null;
    editHistory: string[] | null;
  }

  let saves: SaveItem[] = [];
  let versions: VersionItem[] = [];
  let loading = true;
  let error = '';

  async function load() {
    loading = true;
    error = '';
    try {
      const [savesRes, versionsRes] = await Promise.all([
        fetch('/api/save'),
        fetch('/api/version')
      ]);
      const savesData = await savesRes.json();
      const versionsData = await versionsRes.json();
      if (!savesRes.ok) throw new Error((savesData as { error?: string }).error ?? 'Failed to load saves');
      if (!versionsRes.ok) throw new Error((versionsData as { error?: string }).error ?? 'Failed to load versions');
      saves = (savesData as { saves: SaveItem[] }).saves ?? [];
      versions = (versionsData as { versions: VersionItem[] }).versions ?? [];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load history';
    } finally {
      loading = false;
    }
  }

  $: if (open) { load(); }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleString();
  }

  function downloadStateAsJson(payload: unknown, filename: string) {
    const json = JSON.stringify(
      { ...(payload as object), exportedAt: new Date().toISOString() },
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

  function downloadImageFromDataUrl(dataUrl: string | null, filename: string) {
    if (!dataUrl || !dataUrl.startsWith('data:')) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  async function downloadSave(save: SaveItem) {
    try {
      const res = await fetch(`/api/save/${save.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Load failed');
      const state = (data as { state: Record<string, unknown> }).state;
      const payload = {
        state,
        promptUsed: (state && (state as { promptUsed?: string }).promptUsed) ?? save.promptUsed,
        editHistory: (state && (state as { editHistory?: string[] }).editHistory) ?? save.editHistory
      };
      downloadStateAsJson(payload, `save-${save.id}-${save.createdAt}.json`);
      const mainImage = (state?.elements as { mainImage?: string | null } | undefined)?.mainImage ?? null;
      if (mainImage) {
        downloadImageFromDataUrl(mainImage, `save-${save.id}-image.png`);
      }
    } catch (e) {
      console.error('Download save failed', e);
    }
  }

  async function downloadVersion(ver: VersionItem) {
    try {
      const res = await fetch(`/api/version/${ver.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Load failed');
      const state = (data as { state: Record<string, unknown> }).state;
      const payload = {
        state,
        promptUsed: (state && (state as { promptUsed?: string }).promptUsed) ?? ver.promptUsed,
        editHistory: (state && (state as { editHistory?: string[] }).editHistory) ?? ver.editHistory
      };
      downloadStateAsJson(payload, `version-${ver.id}-${ver.createdAt}.json`);
      const mainImage = (state?.elements as { mainImage?: string | null } | undefined)?.mainImage ?? null;
      if (mainImage) {
        downloadImageFromDataUrl(mainImage, `version-${ver.id}-image.png`);
      }
    } catch (e) {
      console.error('Download version failed', e);
    }
  }

  async function restoreSave(save: SaveItem) {
    try {
      const res = await fetch(`/api/save/${save.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Load failed');
      const state = (data as { state: { canvas: unknown; elements: unknown } }).state;
      if (state?.canvas) canvasTransformStore.set(state.canvas as Parameters<typeof canvasTransformStore.set>[0]);
      if (state?.elements) elementsStore.set(state.elements as Parameters<typeof elementsStore.set>[0]);
      onClose();
    } catch (e) {
      console.error('Restore failed', e);
    }
  }

  async function restoreVersion(ver: VersionItem) {
    try {
      const res = await fetch(`/api/version/${ver.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Load failed');
      const state = (data as { state: { canvas: unknown; elements: unknown } }).state;
      if (state?.canvas) canvasTransformStore.set(state.canvas as Parameters<typeof canvasTransformStore.set>[0]);
      if (state?.elements) elementsStore.set(state.elements as Parameters<typeof elementsStore.set>[0]);
      onClose();
    } catch (e) {
      console.error('Restore failed', e);
    }
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    role="dialog"
    aria-modal="true"
    aria-label="History – saves and versions"
  >
    <div
      class="box-card flex max-h-[85vh] w-full max-w-2xl flex-col border border-slate-200 bg-white p-4 dark:border-slate-600 dark:bg-slate-800"
    >
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-base font-semibold text-slate-800 dark:text-slate-200">History – prompts & changes</h3>
        <button
          type="button"
          class="border border-slate-300 px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          on:click={onClose}
        >
          Close
        </button>
      </div>
      {#if loading}
        <p class="py-4 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
      {:else if error}
        <p class="py-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      {:else}
        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <section>
            <h4 class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Saved images</h4>
            <ul class="space-y-2">
              {#each saves as save}
                <li
                  class="border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/50"
                >
                  <div class="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formatDate(save.createdAt)}
                    {#if save.label}
                      <span class="ml-2 text-slate-700 dark:text-slate-300">— {save.label}</span>
                    {/if}
                  </div>
                  {#if save.promptUsed}
                    <p class="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Prompt:</p>
                    <pre class="mb-2 max-h-20 overflow-y-auto border border-slate-200 bg-white dark:border-slate-600 p-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{save.promptUsed}</pre>
                  {/if}
                  {#if save.editHistory && save.editHistory.length > 0}
                    <p class="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Changes:</p>
                    <ul class="mb-2 list-inside list-disc text-xs text-slate-600 dark:text-slate-400">
                      {#each save.editHistory as change}
                        <li>{change}</li>
                      {/each}
                    </ul>
                  {/if}
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      on:click={() => downloadSave(save)}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      class="border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50"
                      on:click={() => restoreSave(save)}
                    >
                      Restore
                    </button>
                  </div>
                </li>
              {:else}
                <li class="py-2 text-sm text-slate-500 dark:text-slate-400">No saves yet</li>
              {/each}
            </ul>
          </section>
          <section>
            <h4 class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Versions</h4>
            <ul class="space-y-2">
              {#each versions as ver}
                <li
                  class="border border-slate-200 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-700/50"
                >
                  <div class="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                    {formatDate(ver.createdAt)}
                  </div>
                  {#if ver.promptUsed}
                    <p class="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Prompt:</p>
                    <pre class="mb-2 max-h-20 overflow-y-auto border border-slate-200 bg-white dark:border-slate-600 p-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{ver.promptUsed}</pre>
                  {/if}
                  {#if ver.editHistory && ver.editHistory.length > 0}
                    <p class="mb-1 text-xs font-medium text-slate-600 dark:text-slate-300">Changes:</p>
                    <ul class="mb-2 list-inside list-disc text-xs text-slate-600 dark:text-slate-400">
                      {#each ver.editHistory as change}
                        <li>{change}</li>
                      {/each}
                    </ul>
                  {/if}
                  <div class="flex gap-2">
                    <button
                      type="button"
                      class="border border-slate-300 bg-white px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                      on:click={() => downloadVersion(ver)}
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      class="border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-300 dark:hover:bg-sky-900/50"
                      on:click={() => restoreVersion(ver)}
                    >
                      Restore
                    </button>
                  </div>
                </li>
              {:else}
                <li class="py-2 text-sm text-slate-500 dark:text-slate-400">No versions yet</li>
              {/each}
            </ul>
          </section>
        </div>
      {/if}
    </div>
  </div>
{/if}