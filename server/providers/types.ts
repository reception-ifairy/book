export type ModelTag = 'text' | 'image' | 'tts';

export interface ModelInfo {
  id: string;
  label?: string;
  tags: ModelTag[];
}

export interface Media {
  mime: string;
  data: Buffer;
}
