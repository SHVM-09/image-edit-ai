<script lang="ts">
  import { appFlowStore } from '$lib/stores/appFlowStore';
  import type { AppStep } from '$lib/stores/appFlowStore';

  const STEPS: { step: AppStep; label: string }[] = [
    { step: 1, label: '1. Information capture' },
    { step: 2, label: '2. Build prompt & generate image' },
    { step: 3, label: '3. Extract layers' },
    { step: 4, label: '4. Image editor' }
  ];
</script>

<nav class="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" aria-label="Progress">
  {#each STEPS as { step, label }}
    <span
      class="inline-flex items-center border px-3 py-2 text-sm font-medium {step === $appFlowStore
        ? 'border-sky-500 bg-sky-600 text-white dark:border-sky-400 dark:bg-sky-600'
        : step < $appFlowStore
          ? 'border-slate-300 bg-slate-200 text-slate-600 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300'
          : 'border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'}"
    >
      {#if step < $appFlowStore}
        ✓
      {/if}
      {label}
    </span>
  {/each}
</nav>
