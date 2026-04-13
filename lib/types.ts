export type SessionStatus = "uploading" | "generating" | "completed" | "failed";

export interface PhotoSession {
  id: string;
  created_at: string;
  status: SessionStatus;
  original_image_url: string | null;
  generated_image_url: string | null;
  error_message: string | null;
}

export type AppState =
  | { phase: "landing" }
  | { phase: "upload" }
  | { phase: "generating"; sessionId: string }
  | { phase: "result"; sessionId: string; generatedImageUrl: string; originalImageUrl: string; userName: string }
  | { phase: "error"; message: string };
