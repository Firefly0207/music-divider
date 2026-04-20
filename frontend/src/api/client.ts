const BASE = "/api";

export async function uploadFile(
  file: File,
  quality: "fast" | "better"
): Promise<{ job_id: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("quality", quality);
  const res = await fetch(`${BASE}/jobs`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "업로드 실패" }));
    throw new Error(err.detail ?? "업로드 실패");
  }
  return res.json();
}

export async function pollStatus(jobId: string) {
  const res = await fetch(`${BASE}/jobs/${jobId}/status`);
  if (!res.ok) throw new Error("상태 조회 실패");
  return res.json();
}

export async function fetchStems(jobId: string) {
  const res = await fetch(`${BASE}/jobs/${jobId}/stems`);
  if (!res.ok) throw new Error("stem 정보 조회 실패");
  return res.json();
}

export async function fetchWaveform(jobId: string, stemName: string): Promise<number[]> {
  const res = await fetch(`${BASE}/jobs/${jobId}/stems/${stemName}/waveform`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.peaks ?? [];
}

export async function fetchStemBuffer(
  jobId: string,
  stemName: string,
  ctx: AudioContext
): Promise<AudioBuffer> {
  const res = await fetch(`${BASE}/jobs/${jobId}/stems/${stemName}/audio`);
  if (!res.ok) throw new Error(`${stemName} 오디오 로드 실패`);
  const arrayBuffer = await res.arrayBuffer();
  return ctx.decodeAudioData(arrayBuffer);
}

export async function fetchAnalysis(jobId: string) {
  const res = await fetch(`${BASE}/jobs/${jobId}/analysis`);
  if (!res.ok) return { segments: [] };
  return res.json();
}

export async function deleteJob(jobId: string) {
  await fetch(`${BASE}/jobs/${jobId}`, { method: "DELETE" }).catch(() => {});
}
