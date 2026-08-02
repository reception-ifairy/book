export type MessageRole = "user" | "model";

export interface Message {
  role: MessageRole;
  parts: { text: string }[];
  isThinking?: boolean;
}

export type ChatMode = "fast" | "normal" | "deep";
