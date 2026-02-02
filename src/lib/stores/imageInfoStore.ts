import { writable } from 'svelte/store';
import type { ImageInfoFormState } from '$lib/models/imageInfo';

const initialState: ImageInfoFormState = {
  imageType: 'PNG',
  aspectRatio: '1:1',
  usageContext: 'Website',
  description: '',
  messageIntent: '',
  visualElements: [],
  colorScheme: '',
  referenceUrl: ''
};

export const imageInfoStore = writable<ImageInfoFormState>({ ...initialState });

export function resetImageInfoStore() {
  imageInfoStore.set({ ...initialState });
}
