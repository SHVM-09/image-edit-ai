import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'image-edit-ai-theme';

function getInitialTheme(): Theme {
  if (!browser) return 'light';
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'light' || stored === 'dark') return stored;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>(getInitialTheme());

  return {
    subscribe,
    set: (value: Theme) => {
      if (browser) {
        localStorage.setItem(STORAGE_KEY, value);
        document.documentElement.classList.toggle('dark', value === 'dark');
      }
      set(value);
    },
    toggle: () =>
      update((current) => {
        const next = current === 'light' ? 'dark' : 'light';
        if (browser) {
          localStorage.setItem(STORAGE_KEY, next);
          document.documentElement.classList.toggle('dark', next === 'dark');
        }
        return next;
      })
  };
}

export const themeStore = createThemeStore();

if (browser) {
  const initial = getInitialTheme();
  document.documentElement.classList.toggle('dark', initial === 'dark');
}
