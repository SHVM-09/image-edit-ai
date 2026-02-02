<script lang="ts">
  import { imageInfoStore } from '$lib/stores/imageInfoStore';
  import { nextStep } from '$lib/stores/appFlowStore';
  import { confirmPromptPreview } from '$lib/services/promptBuilder';
  import { setCanvasImage } from '$lib/stores/canvasTransformStore';
  import { setMainImage } from '$lib/stores/elementsStore';
  import { applyExtractedLayers } from '$lib/services/layerExtractionService';
  import { setPromptUsed } from '$lib/stores/sessionHistoryStore';
  import type { ImageSpec } from '$lib/models/imageInfo';

  let generatingPrompt = false;
  let generatingImage = false;
  let extractingLayers = false;
  let generatedPrompt: string | null = null;
  let error: string | null = null;

  $: spec = $imageInfoStore as ImageSpec;
  $: draftPreview = confirmPromptPreview(spec);

  async function handleGeneratePrompt() {
    generatingPrompt = true;
    error = null;
    try {
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spec)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate prompt');
      generatedPrompt = data.prompt ?? null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to generate prompt';
    } finally {
      generatingPrompt = false;
    }
  }

  async function handleGenerateImage() {
    const prompt = generatedPrompt || draftPreview;
    if (!prompt?.trim()) {
      error = 'Generate a prompt first, or use the draft above.';
      return;
    }
    generatingImage = true;
    extractingLayers = true;
    error = null;
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio: spec.aspectRatio === 'custom' ? '1:1' : spec.aspectRatio
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate image');
      const imageUrl = data.imageUrl;
      if (!imageUrl) throw new Error('No image returned from API');
      const promptUsedForImage = prompt.trim();
      setPromptUsed(promptUsedForImage);
      setMainImage(imageUrl);
      setCanvasImage(imageUrl);
      await applyExtractedLayers(imageUrl);
      nextStep();
      nextStep();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to generate image';
    } finally {
      generatingImage = false;
      extractingLayers = false;
    }
  }
</script>

<div class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-sky-50 p-6 dark:bg-slate-900">
  <div class="w-full max-w-xl">
    <h2 class="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-100">Step 2: Build prompt & generate image</h2>
    <p class="mb-6 text-sm text-slate-600 dark:text-slate-400">
      We'll build a prompt from your details, send it to the LLM to create an image, then extract layers. After that, the editor will open.
    </p>

    <div class="space-y-6">
      <div class="box-card">
        <h3 class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Prompt (from your details)</h3>
        <pre class="max-h-40 overflow-y-auto border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">{draftPreview || '—'}</pre>
        <button
          type="button"
          class="box-btn-primary mt-3 border-slate-700 bg-slate-700 hover:bg-slate-600 dark:border-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500"
          disabled={generatingPrompt}
          on:click={handleGeneratePrompt}
        >
          {generatingPrompt ? 'Improving…' : 'Improve prompt with LLM'}
        </button>
        {#if generatedPrompt}
          <div class="mt-3 border border-sky-200 bg-sky-50 dark:border-sky-800 p-3 dark:bg-sky-900/30">
            <p class="text-xs font-medium text-sky-800 dark:text-sky-200">Improved prompt (for image):</p>
            <pre class="mt-1 max-h-32 overflow-y-auto text-xs text-slate-700 whitespace-pre-wrap dark:text-slate-300">{generatedPrompt}</pre>
          </div>
        {/if}
      </div>

      <div class="box-card">
        <h3 class="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">Generate image & extract layers</h3>
        <p class="mb-3 text-xs text-slate-600 dark:text-slate-400">
          Creates the image and extracts up to 12 layers. Then the image editor will open.
        </p>
        <button
          type="button"
          class="box-btn-primary disabled:opacity-50"
          disabled={generatingImage}
          on:click={handleGenerateImage}
        >
          {#if generatingImage}
            {extractingLayers ? 'Extracting layers…' : 'Generating image…'}
          {:else}
            Generate image & open editor
          {/if}
        </button>
      </div>

      {#if error}
        <p class="border border-red-200 bg-red-50 dark:border-red-800 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>
      {/if}
    </div>
  </div>
</div>
