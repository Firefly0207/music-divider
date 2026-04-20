export type AppPhase = "idle" | "uploading" | "processing" | "ready";

export interface StemInfo {
  name: string;
  label: string;
  color: string;
}

export interface StemState extends StemInfo {
  muted: boolean;
  solo: boolean;
  volume: number;       // 0.0 ~ 1.0
  peaks: number[];      // waveform 데이터
  buffer: AudioBuffer | null;
}

export interface JobStatus {
  status: "processing" | "done" | "error";
  progress: number;
  stage: string;
  error: string | null;
}

export interface SoundSegment {
  index: number;
  time_start: number;
  time_end: number;
  energy: number;
  tags: string[];
}

export const TAG_LABELS: Record<string, string> = {
  vocal_strong: "보컬",
  drum_strong: "드럼",
  bass_heavy: "저음",
  guitar_strong: "기타",
  piano_strong: "피아노",
  quiet: "조용",
  loud: "강렬",
};

export const TAG_COLORS: Record<string, string> = {
  vocal_strong: "#6366f1",
  drum_strong: "#f43f5e",
  bass_heavy: "#f59e0b",
  guitar_strong: "#10b981",
  piano_strong: "#8b5cf6",
  quiet: "#94a3b8",
  loud: "#06b6d4",
};
