<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { imageInfoStore } from '$lib/stores/imageInfoStore';
  import type { ImageSpec, ImageInfoFormState } from '$lib/models/imageInfo';
  import {
    IMAGE_TYPES,
    ASPECT_RATIOS,
    USAGE_CONTEXTS
  } from '$lib/models/imageInfo';

  const dispatch = createEventDispatcher<{ submit: ImageSpec }>();

  let errors: Partial<Record<keyof ImageInfoFormState, string>> = {};
  let tagInput = '';

  function validate(): boolean {
    const state = $imageInfoStore;
    errors = {};

    if (!state.description.trim()) {
      errors.description = 'Description is required';
    }

    if (state.referenceUrl.trim() && !isValidUrl(state.referenceUrl)) {
      errors.referenceUrl = 'Enter a valid URL';
    }

    return Object.keys(errors).length === 0;
  }

  function isValidUrl(s: string): boolean {
    try {
      new URL(s);
      return true;
    } catch {
      return false;
    }
  }

  function handleSubmit() {
    if (!validate()) {
      return;
    }
    const state = $imageInfoStore;
    const spec: ImageSpec = {
      imageType: state.imageType,
      aspectRatio: state.aspectRatio,
      usageContext: state.usageContext,
      description: state.description.trim(),
      messageIntent: state.messageIntent.trim(),
      visualElements: [...state.visualElements],
      colorScheme: state.colorScheme.trim(),
      referenceUrl: state.referenceUrl.trim()
    };
    dispatch('submit', spec);
  }

  function addTag() {
    const tag = tagInput.trim().replace(/,/g, '');
    if (!tag) return;
    imageInfoStore.update((s) => ({
      ...s,
      visualElements: s.visualElements.includes(tag)
        ? s.visualElements
        : [...s.visualElements, tag]
    }));
    tagInput = '';
  }

  function removeTag(tag: string) {
    imageInfoStore.update((s) => ({
      ...s,
      visualElements: s.visualElements.filter((t) => t !== tag)
    }));
  }

  function handleTagKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="flex flex-col gap-4">
  <div>
    <label for="imageType" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      1. Type of image
    </label>
    <select
      id="imageType"
      class="box-input"
      value={$imageInfoStore.imageType}
      on:change={(e) =>
        imageInfoStore.update((s) => ({
          ...s,
          imageType: (e.currentTarget as HTMLSelectElement).value as ImageSpec['imageType']
        }))}
    >
      {#each IMAGE_TYPES as type}
        <option value={type}>{type}</option>
      {/each}
    </select>
  </div>

  <div>
    <label for="aspectRatio" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      2. Size and aspect ratio
    </label>
    <select
      id="aspectRatio"
      class="box-input"
      value={$imageInfoStore.aspectRatio}
      on:change={(e) =>
        imageInfoStore.update((s) => ({
          ...s,
          aspectRatio: (e.currentTarget as HTMLSelectElement).value as ImageSpec['aspectRatio']
        }))}
    >
      {#each ASPECT_RATIOS as ratio}
        <option value={ratio}>{ratio}</option>
      {/each}
    </select>
  </div>

  <div>
    <label for="usageContext" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      3. Where the image will be used
    </label>
    <select
      id="usageContext"
      class="box-input"
      value={$imageInfoStore.usageContext}
      on:change={(e) =>
        imageInfoStore.update((s) => ({
          ...s,
          usageContext: (e.currentTarget as HTMLSelectElement).value as ImageSpec['usageContext']
        }))}
    >
      {#each USAGE_CONTEXTS as ctx}
        <option value={ctx}>{ctx}</option>
      {/each}
    </select>
  </div>

  <div>
    <label for="description" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      4. Description — What should the image convey or message to the viewer? <span class="text-red-500 dark:text-red-400">*</span>
    </label>
    <textarea
      id="description"
      rows="3"
      class="box-input {errors.description
        ? 'border-red-500 dark:border-red-400'
        : ''}"
      placeholder="What should the image convey or message to the viewer?"
      value={$imageInfoStore.description}
      on:input={(e) =>
        imageInfoStore.update((s) => ({
          ...s,
          description: (e.currentTarget as HTMLTextAreaElement).value
        }))}
    ></textarea>
    {#if errors.description}
      <p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.description}</p>
    {/if}
  </div>

  <div>
    <label for="messageIntent" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      Message intent
    </label>
    <input
      type="text"
      id="messageIntent"
      class="box-input"
      placeholder="What should the image communicate?"
      value={$imageInfoStore.messageIntent}
      on:input={(e) =>
        imageInfoStore.update((s) => ({
          ...s,
          messageIntent: (e.currentTarget as HTMLInputElement).value
        }))}
    />
  </div>

  <div>
    <label for="visualElements" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      5. What elements should be used in the image
    </label>
    <div
      class="box-input flex flex-wrap gap-2 border border-slate-300 bg-white px-3 py-2 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 dark:border-slate-600 dark:bg-slate-700 dark:focus-within:border-sky-400 dark:focus-within:ring-sky-400/20"
    >
      {#each $imageInfoStore.visualElements as tag}
        <span
          class="inline-flex items-center gap-1 border border-sky-300 bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:border-sky-600 dark:bg-sky-900/50 dark:text-sky-200"
        >
          {tag}
          <button
            type="button"
            class="hover:bg-sky-200 dark:hover:bg-sky-800"
            aria-label="Remove {tag}"
            on:click={() => removeTag(tag)}
          >
            ×
          </button>
        </span>
      {/each}
      <input
        type="text"
        id="visualElements"
        class="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-0 dark:bg-transparent dark:text-slate-100 dark:placeholder:text-slate-400"
        placeholder="Add tag, press Enter (e.g. light, spanner, oil)"
        bind:value={tagInput}
        on:keydown={handleTagKeydown}
        on:blur={() => addTag()}
      />
    </div>
  </div>

  <div>
    <label for="colorScheme" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      6. What color scheme to be used
    </label>
    <input
      type="text"
      id="colorScheme"
      class="box-input"
      placeholder="e.g. light, dark, URL of website, brand spec"
      value={$imageInfoStore.colorScheme}
      on:input={(e) =>
        imageInfoStore.update((s) => ({
          ...s,
          colorScheme: (e.currentTarget as HTMLInputElement).value
        }))}
    />
  </div>

  <div>
    <label for="referenceUrl" class="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
      Reference URL
    </label>
    <input
      type="url"
      id="referenceUrl"
      class="box-input {errors.referenceUrl
        ? 'border-red-500 dark:border-red-400'
        : ''}"
      placeholder="https://..."
      value={$imageInfoStore.referenceUrl}
      on:input={(e) =>
        imageInfoStore.update((s) => ({
          ...s,
          referenceUrl: (e.currentTarget as HTMLInputElement).value
        }))}
    />
    {#if errors.referenceUrl}
      <p class="mt-1 text-xs text-red-600 dark:text-red-400">{errors.referenceUrl}</p>
    {/if}
  </div>

  <button
    type="submit"
    class="box-btn-primary mt-2 border border-transparent bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
  >
    Next
  </button>
</form>
