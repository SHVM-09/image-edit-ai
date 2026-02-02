<script lang="ts">
  import Header from './Header.svelte';
</script>

<div class="min-h-screen bg-slate-100 dark:bg-slate-950">
  <Header />
  <main class="pt-14">
    <div class="p-4 md:p-6">
      <slot />
    </div>
  </main>
</div>
