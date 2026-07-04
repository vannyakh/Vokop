import type { ImageAnalyzeRequest, ImageAnalyzeResponse } from '@vokop/api';
import { optionsForFeature } from '../llm/capabilities.js';
import { completeWithMediaJson } from '../llm/index.js';

interface ImageLlmPayload {
  description?: string;
  ocrText?: string;
  labels?: string[];
  captionSuggestion?: string;
  objects?: string[];
}

export async function analyzeImage(input: ImageAnalyzeRequest): Promise<ImageAnalyzeResponse> {
  const llmOpts = optionsForFeature('image', {
    provider: input.provider,
    model: input.model,
  });

  const taskHint =
    input.task === 'ocr'
      ? 'Focus on extracting all readable text (OCR).'
      : input.task === 'caption'
        ? 'Focus on a short on-screen caption suggestion for a video editor.'
        : 'Provide a full scene analysis for a video editor.';

  const prompt = `Analyze this image for a CapCut-style video editor.

${taskHint}
${input.prompt ? `User request: ${input.prompt}` : ''}

Return JSON only:
{
  "description": "1-3 sentence scene description",
  "ocrText": "any visible text, or empty string",
  "labels": ["tag1", "tag2"],
  "objects": ["object1"],
  "captionSuggestion": "short caption ≤ 48 chars"
}`;

  const result = await completeWithMediaJson<ImageLlmPayload>(
    prompt,
    { data: input.imageBase64, mimeType: input.mimeType },
    { ...llmOpts, temperature: 0.2 },
  );

  return {
    description: result.description?.trim() || '',
    ocrText: result.ocrText?.trim() || undefined,
    labels: result.labels?.filter(Boolean) ?? [],
    objects: result.objects?.filter(Boolean),
    captionSuggestion: result.captionSuggestion?.trim() || undefined,
    provider: llmOpts.provider,
    model: llmOpts.model,
  };
}
