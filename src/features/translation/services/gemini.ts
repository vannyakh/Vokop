import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function withRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 500 || error.status === 503 || error.status === 429)) {
      console.warn(`Gemini API error (${error.status}). Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function transcribeVideo(videoBase64: string, mimeType: string) {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: videoBase64,
                mimeType: mimeType,
              },
            },
            {
              text: `Please provide a verbatim transcript of the spoken dialogue in this video. 

IMPORTANT: 
- Identify the primary spoken language in the video.
- Ignore background music, songs, or non-speech sounds. 
- Only transcribe spoken words. 
- Identify different speakers (e.g., Speaker 1, Speaker 2).
- Include timestamps in the format [MM:SS] Speaker: Text.

Format your response as a JSON object:
{
  "detectedLanguage": "string (e.g. English, Khmer, Spanish)",
  "transcript": "string (the full formatted transcript)"
}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text);
  });
}

export async function analyzeVideo(videoBase64: string, mimeType: string, language: string) {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              inlineData: {
                data: videoBase64,
                mimeType: mimeType,
              },
            },
            {
              text: `Analyze this video for a highlight summary in ${language}.
Provide:
1. A total summary.
2. A list of exactly 5-7 "Highlight Clips". For each clip, specify the start and end timestamp and a short narration script (1 sentence).

Format as JSON: 
{ 
  "summary": "string",
  "highlights": [
    { "start": "MM:SS", "end": "MM:SS", "narration": "string" }
  ]
}`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text);
  });
}

export async function translateText(text: string, targetLanguage: string, sourceLanguage?: string) {
  return withRetry(async () => {
    const sourceContext = sourceLanguage ? `from ${sourceLanguage} ` : "";
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Translate the following transcript ${sourceContext}into ${targetLanguage}. 

Guidelines:
- Maintain the speaker identification and timestamp format exactly: [MM:SS] Speaker: Text.
- Capture the tone and context accurately.
- For technical or slang terms, use the most natural equivalent in ${targetLanguage}.
- If there are multiple speakers, ensure the distinction between their voices is clear in the translation.

Transcript:
${text}`,
    });
    return response.text;
  });
}

export async function generateMultiSpeakerSpeech(text: string, speakerVoices: Record<string, string>) {
  return withRetry(async () => {
    const speakerEntries = Object.entries(speakerVoices);

    // Gemini 2.5 Flash TTS currently requires exactly 2 speakers for multi-speaker mode
    if (speakerEntries.length === 2) {
      try {
        const speakerConfigs = speakerEntries.map(([speaker, voice]) => ({
          speaker,
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice }
          }
        }));

        // Strip timestamps for TTS to avoid confusing the multi-speaker engine
        // Format is usually [MM:SS] Speaker: Text
        const cleanText = text.replace(/\[\d{2}:\d{2}\]\s+/g, '');

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: `TTS the following conversation:\n${cleanText}` }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: speakerConfigs
              }
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) return base64Audio;
        
        console.warn("Multi-speaker TTS returned no audio data, falling back to single speaker.");
      } catch (error) {
        console.warn("Multi-speaker TTS failed, falling back to single speaker:", error);
      }
    }
    
    // Fallback to single speaker mode if not exactly 2 speakers or if multi-speaker call failed
    const defaultVoice = speakerEntries.length > 0 ? speakerEntries[0][1] : 'Kore';
    return generateSpeech(text, defaultVoice);
  });
}

export async function generateSpeech(text: string, voice: string = 'Kore') {
  return withRetry(async () => {
// ...
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Failed to generate audio");
    
    return base64Audio;
  });
}
