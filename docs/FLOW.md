# App Flow — Phase 1

## 1. Information capture

1. **Type of image** — PNG, JPG (ImageInfoForm: “1. Type of image”).
2. **Size and aspect ratio** — 1:1, 9:16, 16:9, custom (“2. Size and aspect ratio”).
3. **Where the image will be used** — Website, Presentation, Documentation (“3. Where the image will be used”).
4. **Description** — What should the image convey or message to the viewer? (“4. Description”).
5. **Elements to use** — e.g. for Automotive service: light, chars, spanner, oil (“5. What elements should be used in the image”).
6. **Color scheme** — light, dark, URL of website, brand spec (“6. What color scheme to be used”). Reference URL supported.

**Store:** `imageInfoStore`. **Component:** `ImageInfoForm.svelte`.

---

## 2. Image generation

1. **Description for confirmation** — `confirmPromptPreview(spec)` shows a readable prompt for user confirmation or edits.
2. **Design spec** — Same spec is used to build a design spec for future images of similar type (promptBuilder).
3. **Generate prompt and send to LLM** — `POST /api/generate-prompt` (Gemini) produces the image prompt; display in GenAIChatPanel (“Generated prompt before image generation”). Then call `imageService.generateImage(prompt, size, format)` for beautify/segmentation (mock URL for now).

**Services:** `promptBuilder.ts`, `promptBuilder.server.ts`, `imageService.ts`. **Components:** GenAIChatPanel (ask actions + prompt display), canvas when image is set.

---

## 3. Layer extraction

1. **Prompt to identify important images** — `createLayerExtractionPrompt()` (up to 10 images + background + text, max 12 elements).
2. **Extract layers** — `extractLayers(mainImageUrl)` returns up to 12 elements (image regions, background, text). Mock implementation; replace with real LLM/vision API.
3. **Editor layout** — Full image on canvas (top/center); up to 12 sub-elements in ElementPanel (list below / left).
4. **Selection** — User can click an element on the main canvas or in the element list to select for editing.
5. **Refresh main** — When elements are edited, main image can be refreshed (recomposite or regenerate); versionStore supports rollback.

**Service:** `layerExtractionService.ts` (`extractLayers`, `applyExtractedLayers`). **Stores:** `elementsStore` (mainImage, elementList), `canvasTransformStore`. **Components:** CanvasPanel (main image), ElementPanel (list of up to 12 elements).

---

## 4. Image edits

1. **Edit pane** — Clicking an element in the list selects it and shows it in the right edit pane (ElementEditor).
2. **Edit options** — Color, Opacity, Rotate, Zoom, Delete (ElementEditor + TopToolbar). Text elements: Font size, Font type (ElementEditor).
3. **Full re-generation** — Other changes can trigger full image re-generation with same size (imageService + prompt).
4. **Refresh main** — When main image is refreshed, sub-image changes are reflected; versionStore holds versions for rollback.
5. **Alignment** — If size changes cause alignment issues, user can describe the issue in GenAIChatPanel; prompt can be sent to LLM to fix. Manual alignment via drag (CanvasPanel).
6. **Text overlay** — Text is overlay on top of image; font size and type supported without image regeneration.
7. **Re-arrange** — User can reorder elements in ElementPanel (↑ / ↓) via `reorderElement(fromIndex, toIndex)`.

**Stores:** `elementsStore`, `canvasTransformStore`. **Components:** ElementEditor, ElementPanel (reorder), TopToolbar, CanvasPanel.

---

## 5. Prompt generation

- **Ask actions (GenAIChatPanel):** Purpose of image, What message, Issue with current image, Components for image, Reference examples, Improvement feedback.
- **Reference extraction** — If user provides a busy reference (e.g. “I like the way the car is drawn and the background color”), extract those parts and show for confirmation; once confirmed, use for new image creation (placeholder for future API).
- **System prompt** — Based on user answers, design spec, and image context (size, ratio, etc.), the system generates a good prompt via `promptBuilder` / Gemini to create or update the image.

**Service:** `promptBuilder`, `/api/generate-prompt`. **Component:** GenAIChatPanel.

---

## 6. Repository and versions

- **Versions** — `versionStore`: `saveVersion(stateSnapshot)`, `listVersions()`, `restoreVersion(id)`. Rollback for main image and elements (localStorage).
- **Repository** — `repositoryStore`: `saveToRepository(label?)`, `listRepository()`, `getRepositoryItem(id)`, `removeFromRepository(id)`. Store “good” images for future use and reference (localStorage).

**Stores:** `versionStore.ts`, `repositoryStore.ts`.

---

## Flow phases (UI)

- **appFlowStore** — Phases: `capture` | `generate` | `extract` | `edit`.
- **FlowIndicator.svelte** — Shows current phase and allows switching (1. Information capture, 2. Image generation, 3. Layer extraction, 4. Image edits).

Integrate `FlowIndicator` into the editor layout (e.g. above or below TopToolbar) so users can see and switch phases.
