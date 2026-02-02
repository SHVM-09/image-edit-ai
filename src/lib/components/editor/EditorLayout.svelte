<script lang="ts">
  import TopToolbar from './TopToolbar.svelte';
  import ElementPanel from './ElementPanel.svelte';
  import CanvasPanel from './CanvasPanel.svelte';
  import ElementEditor from './ElementEditor.svelte';
  import GenAIChatPanel from './GenAIChatPanel.svelte';
</script>

<div class="flex h-full min-h-0 w-full flex-1 flex-col border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
  <div
    class="grid flex-1 min-h-0 w-full"
    style="grid-template-columns: 300px 1fr 380px; grid-template-rows: 60px 1fr"
  >
    <div class="col-span-3 min-h-[60px]">
      <TopToolbar />
    </div>
    <ElementPanel />
    <CanvasPanel />
    <div class="flex min-h-0 flex-col overflow-hidden border-l border-slate-200 dark:border-slate-700">
      <div class="shrink-0">
        <ElementEditor />
      </div>
      <div class="min-h-0 flex-1 overflow-hidden">
        <GenAIChatPanel />
      </div>
    </div>
  </div>
</div>
