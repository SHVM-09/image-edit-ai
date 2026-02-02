<script lang="ts">
  import ImageInfoForm from '$lib/components/forms/ImageInfoForm.svelte';
  import { nextStep } from '$lib/stores/appFlowStore';

  function handleSubmit() {
    nextStep();
  }
</script>

<div class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-slate-100 p-6 dark:bg-slate-950">
  <div class="w-full max-w-xl">
    <h2 class="mb-2 text-xl font-semibold text-slate-800 dark:text-slate-100">Step 1: Information capture</h2>
    <p class="mb-6 text-sm text-slate-600 dark:text-slate-400">
      Enter details for the image you want to create. After this, we'll build a prompt and generate the image with layers.
    </p>
    <div class="box-card p-6">
      <ImageInfoForm on:submit={handleSubmit} />
    </div>
  </div>
</div>
