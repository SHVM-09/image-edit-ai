import { writable } from 'svelte/store';

/** Step 1: Information capture. Step 2: Build prompt + generate image. Step 3: Extract layers (auto). Step 4: Image editor. */
export type AppStep = 1 | 2 | 3 | 4;

const INITIAL_STEP: AppStep = 1;

export const appFlowStore = writable<AppStep>(INITIAL_STEP);

/** Advance to the next step (forward only). */
export function nextStep(): void {
  appFlowStore.update((step) => {
    if (step < 4) return (step + 1) as AppStep;
    return step;
  });
}

/** Set step. Only allow going to a step ≤ current (so user can go back) or to next. For strict forward-only, use nextStep() only. */
export function setStep(step: AppStep): void {
  appFlowStore.set(step);
}

/** Reset flow to step 1 (e.g. start over). */
export function resetFlow(): void {
  appFlowStore.set(INITIAL_STEP);
}

/** Whether the user has reached the editor (step 4). Only show editor when true. */
export function isEditorStep(step: AppStep): step is 4 {
  return step === 4;
}
