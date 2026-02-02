import { writable } from 'svelte/store';

/** Prompt used to generate the current image (set when image is generated in Step 2). */
export const promptUsed = writable<string | null>(null);

/** Edit instructions applied in this session (LLM layer edits). */
export const editHistory = writable<string[]>([]);

export function setPromptUsed(prompt: string | null) {
  promptUsed.set(prompt);
}

export function addEditInstruction(instruction: string) {
  editHistory.update((list) => [...list, instruction]);
}

export function resetSessionHistory() {
  promptUsed.set(null);
  editHistory.set([]);
}
