<script lang="ts">
  import { appFlowStore } from '$lib/stores/appFlowStore';
  import InformationCaptureStep from '$lib/components/editor/InformationCaptureStep.svelte';
  import ImageGenerationStep from '$lib/components/editor/ImageGenerationStep.svelte';
  import EditorLayout from '$lib/components/editor/EditorLayout.svelte';
  import FlowIndicator from '$lib/components/editor/FlowIndicator.svelte';
</script>

<div class="flex h-full min-h-[calc(100vh-3.5rem)] flex-col bg-slate-100 dark:bg-slate-950 md:min-h-[calc(100vh-3.5rem)]">
  <FlowIndicator />
  {#if $appFlowStore === 1}
    <InformationCaptureStep />
  {:else if $appFlowStore === 2}
    <ImageGenerationStep />
  {:else if $appFlowStore === 4}
    <EditorLayout />
  {:else}
    <div class="flex flex-1 items-center justify-center p-6 text-slate-500 dark:text-slate-400">
      <p>Extracting layers…</p>
    </div>
  {/if}
</div>
