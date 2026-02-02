<script lang="ts">
  import { themeStore } from '$lib/stores/themeStore';
</script>

<header
  class="fixed top-0 right-0 left-0 z-40 flex h-14 items-center border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
>
  <div class="flex w-full items-center justify-between">
    <h1 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Image Edit AI</h1>
    <button
      type="button"
      class="p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      aria-label="Toggle dark mode"
      on:click={() => themeStore.toggle()}
    >
      {#if $themeStore === 'dark'}
        <span aria-hidden="true">☀</span>
      {:else}
        <span aria-hidden="true">☽</span>
      {/if}
    </button>
  </div>
</header>
