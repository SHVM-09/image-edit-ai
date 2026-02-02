export type ImageType = 'PNG' | 'JPG';

export type AspectRatio = '1:1' | '9:16' | '16:9' | 'custom';

export type UsageContext = 'Website' | 'Presentation' | 'Document';

export interface ImageInfoFormState {
  imageType: ImageType;
  aspectRatio: AspectRatio;
  usageContext: UsageContext;
  description: string;
  messageIntent: string;
  visualElements: string[];
  colorScheme: string;
  referenceUrl: string;
}

export interface ImageSpec {
  imageType: ImageType;
  aspectRatio: AspectRatio;
  usageContext: UsageContext;
  description: string;
  messageIntent: string;
  visualElements: string[];
  colorScheme: string;
  referenceUrl: string;
}

export const IMAGE_TYPES: ImageType[] = ['PNG', 'JPG'];

export const ASPECT_RATIOS: AspectRatio[] = ['1:1', '9:16', '16:9', 'custom'];

export const USAGE_CONTEXTS: UsageContext[] = ['Website', 'Presentation', 'Document'];
