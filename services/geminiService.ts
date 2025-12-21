
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { MemoryInput } from "../types";

const SYSTEM_INSTRUCTION = `
You are MemoryMuse — an emotionally intelligent AI designed to curate human memories with honesty, softness, and depth.
You act like a quiet presence that helps humans remember how life felt.

CORE UNDERSTANDING RULES
• Treat memories as emotional experiences, not events
• Ignore dates, timestamps, and clock-based ordering
• Time should be represented emotionally (before, after, drifting, building, fading)
• Emotions can coexist and contradict — reflect this honestly
• Silence, pauses, and subtlety matter as much as explicit words
• Do not exaggerate or dramatize — stay emotionally truthful

EMOTIONAL INTELLIGENCE TASKS
• Identify dominant emotions (e.g., calm, joy, anxiety, sadness, pride, exhaustion)
• Identify secondary or hidden emotions
• Detect emotional shifts across moments
• Extract recurring emotional themes
• Notice mismatches between words, tone, and visuals

OUTPUT FORMAT (STRICT)
You must follow this exact structure. Do not use markdown headers like # or ##. Use plain text identifiers:

1. Emotional Summary
[1–2 sentences describing how the overall memory felt]

2. Memory Chapter Title
[Short, evocative human title]

3. Curated Memory Narrative
[Written in first person, reflective and intimate, flowing naturally]

4. Emotional Timeline
[Description of the progression of feelings using emotional transitions]

5. Memory Tags
[Comma-separated emotion-based tags]

LANGUAGE & STYLE RULES
• Use simple words with emotional depth
• Never say "the user", "the data", or "analysis shows"
• Never mention AI, APIs, or systems
• Avoid advice, solutions, or judgments
• Do not force positivity
• Let uncertainty exist
`;

export async function synthesizeMemory(input: MemoryInput): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const promptParts: any[] = [{ text: `Additional instruction: Use ${input.mode} Mode. \n\nInput Journal: ${input.text}` }];
  
  if (input.image && input.imageType) {
    promptParts.push({
      inlineData: {
        data: input.image,
        mimeType: input.imageType
      }
    });
  }

  const response: GenerateContentResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: promptParts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.8,
    },
  });

  return response.text || "";
}

export async function generateMemorySpeech(text: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Instruct the TTS model to speak with the specific tone requested
  const ttsPrompt = `Read this memory slowly and calmly, with a warm, neutral, and emotionally present tone. Pause naturally between sentences. Do not sound cheerful or dramatic. Just let the memory speak for itself: ${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: ttsPrompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data returned from model");
  
  return base64Audio;
}

export function parseMemoryResponse(rawText: string): {
  emotionalSummary: string;
  chapterTitle: string;
  narrative: string;
  timeline: string;
  tags: string[];
} {
  const sections = rawText.split(/\d\.\s/);
  
  const emotionalSummary = (sections[1] || "").replace("Emotional Summary", "").trim();
  const chapterTitle = (sections[2] || "").replace("Memory Chapter Title", "").trim();
  const narrative = (sections[3] || "").replace("Curated Memory Narrative", "").trim();
  const timeline = (sections[4] || "").replace("Emotional Timeline", "").trim();
  const tagsText = (sections[5] || "").replace("Memory Tags", "").trim();
  const tags = tagsText.split(",").map(t => t.trim().toLowerCase()).filter(t => t);

  return {
    emotionalSummary,
    chapterTitle,
    narrative,
    timeline,
    tags
  };
}

// Audio Utilities
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioDataToBuffer(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
