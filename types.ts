
export interface MemoryInput {
  text: string;
  image?: string;
  imageType?: string;
  mode: 'Default' | 'Poetic' | 'Honest' | 'Cinematic' | 'Minimal';
}

export interface MemoryChapter {
  id: string;
  emotionalSummary: string;
  chapterTitle: string;
  narrative: string;
  timeline: string;
  tags: string[];
  createdAt: number;
  originalImage?: string;
  audioData?: string; // Base64 raw PCM audio data
}

export enum AppStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  SYNTHESIZING_VOICE = 'synthesizing_voice',
  RESULT = 'result',
  ERROR = 'error'
}
