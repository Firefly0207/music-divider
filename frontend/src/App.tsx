import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteJob,
  fetchAnalysis,
  fetchStemBuffer,
  fetchStems,
  fetchWaveform,
  pollStatus,
  uploadFile,
} from "./api/client";
import ProcessingOverlay from "./components/ProcessingOverlay";
import PlayerControls from "./components/PlayerControls";
import StemTrack from "./components/StemTrack";
import SoundTags from "./components/SoundTags";
import Uploader from "./components/Uploader";
import { useStemPlayer } from "./hooks/useStemPlayer";
import { AppPhase, SoundSegment, StemState } from "./types";

export default function App() {
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [filename, setFilename] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [stems, setStems] = useState<StemState[]>([]);
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState<SoundSegment[]>([]);

  const [loopIn, setLoopIn] = useState<number | null>(null);
  const [loopOut, setLoopOut] = useState<number | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { currentTime, isPlaying, play, pause, seek, updateGain, getCtx } = useStemPlayer(duration);

  // ── loop 감시: 현재 위치가 loopOut 넘으면 loopIn으로 되돌림 ──────────
  const loopInRef = useRef<number | null>(null);
  const loopOutRef = useRef<number | null>(null);
  loopInRef.current = loopIn;
  loopOutRef.current = loopOut;

  useEffect(() => {
    if (
      loopIn !== null &&
      loopOut !== null &&
      isPlaying &&
      currentTime >= loopOut
    ) {
      seek(loopIn, stems, true);
    }
  }, [currentTime, loopIn, loopOut, isPlaying, stems, seek]);

  // ── cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (jobId) deleteJob(jobId);
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [jobId]);

  // 탭 닫을 때 cleanup
  useEffect(() => {
    const handler = () => { if (jobId) deleteJob(jobId); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [jobId]);

  // ── 파일 업로드 + 폴링 ────────────────────────────────────────────────
  const handleFile = useCallback(
    async (file: File, quality: "fast" | "better") => {
      setError(null);
      setPhase("uploading");
      setFilename(file.name);

      try {
        const { job_id } = await uploadFile(file, quality);
        setJobId(job_id);
        setPhase("processing");
        setProcessingProgress(0);
        setProcessingStage("서버로 전송 완료");
        startPolling(job_id);
      } catch (e: unknown) {
        setError((e as Error).message ?? "업로드 실패");
        setPhase("idle");
      }
    },
    [] // eslint-disable-line
  );

  const startPolling = (id: string) => {
    const poll = async () => {
      try {
        const status = await pollStatus(id);
        setProcessingProgress(status.progress);
        setProcessingStage(status.stage);

        if (status.status === "done") {
          await loadResults(id);
          return;
        }
        if (status.status === "error") {
          setError(status.error ?? "처리 중 오류 발생");
          setPhase("idle");
          return;
        }
        pollRef.current = setTimeout(poll, 1000);
      } catch {
        pollRef.current = setTimeout(poll, 2000);
      }
    };
    poll();
  };

  const loadResults = async (id: string) => {
    const ctx = getCtx();

    const { stems: stemInfos, duration: dur } = await fetchStems(id);
    setDuration(dur);

    // 각 stem: waveform + audio buffer 병렬 로드
    const stemStates: StemState[] = await Promise.all(
      stemInfos.map(async (info: { name: string; label: string; color: string }) => {
        const [peaks, buffer] = await Promise.all([
          fetchWaveform(id, info.name),
          fetchStemBuffer(id, info.name, ctx).catch(() => null),
        ]);
        return {
          ...info,
          muted: false,
          solo: false,
          volume: 1.0,
          peaks,
          buffer,
        } as StemState;
      })
    );

    setStems(stemStates);

    // sound tag 분석
    const analysis = await fetchAnalysis(id);
    setSegments(analysis.segments ?? []);

    setPhase("ready");
  };

  // ── 재생 컨트롤 ──────────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      // solo 적용: solo가 있으면 solo인 것만, 없으면 unmuted 전부
      const hasSolo = stems.some((s) => s.solo);
      const active = stems.map((s) => ({
        ...s,
        muted: hasSolo ? !s.solo : s.muted,
      }));
      play(active);
    }
  }, [isPlaying, stems, play, pause]);

  const handleSeek = useCallback(
    (t: number) => {
      const hasSolo = stems.some((s) => s.solo);
      const active = stems.map((s) => ({ ...s, muted: hasSolo ? !s.solo : s.muted }));
      seek(t, active, isPlaying);
    },
    [stems, isPlaying, seek]
  );

  const handleMute = useCallback((name: string) => {
    setStems((prev) =>
      prev.map((s) => {
        if (s.name !== name) return s;
        const next = { ...s, muted: !s.muted };
        updateGain(name, next.volume, next.muted);
        return next;
      })
    );
  }, [updateGain]);

  const handleSolo = useCallback((name: string) => {
    setStems((prev) => {
      const clicked = prev.find((s) => s.name === name);
      const newSolo = !clicked?.solo;
      return prev.map((s) => {
        const isSolo = s.name === name ? newSolo : false;
        const muted = newSolo ? !isSolo : s.muted;
        updateGain(s.name, s.volume, muted);
        return { ...s, solo: isSolo };
      });
    });
  }, [updateGain]);

  const handleVolume = useCallback((name: string, v: number) => {
    setStems((prev) =>
      prev.map((s) => {
        if (s.name !== name) return s;
        updateGain(name, v, s.muted);
        return { ...s, volume: v };
      })
    );
  }, [updateGain]);

  // ── reset ─────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (jobId) { deleteJob(jobId); setJobId(null); }
    pause();
    setStems([]);
    setDuration(0);
    setSegments([]);
    setLoopIn(null);
    setLoopOut(null);
    setError(null);
    setPhase("idle");
  };

  // ── 키보드 단축키 ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (phase !== "ready") return;
      if (e.code === "Space") { e.preventDefault(); handlePlayPause(); }
      if (e.code === "ArrowLeft") handleSeek(Math.max(0, currentTime - 5));
      if (e.code === "ArrowRight") handleSeek(Math.min(duration, currentTime + 5));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handlePlayPause, handleSeek, currentTime, duration]);

  // ── 렌더 ──────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <h1>Music Divider</h1>
        <span className="app-subtitle">사운드 탐색기</span>
        {phase === "ready" && (
          <button className="reset-btn" onClick={handleReset}>
            다른 파일
          </button>
        )}
      </header>

      {error && (
        <div className="error-banner">
          ⚠ {error}
          <button onClick={() => setError(null)}>닫기</button>
        </div>
      )}

      {(phase === "idle" || phase === "uploading") && (
        <main className="main-idle">
          <Uploader onFile={handleFile} disabled={phase === "uploading"} />
        </main>
      )}

      {phase === "processing" && (
        <ProcessingOverlay
          progress={processingProgress}
          stage={processingStage}
          filename={filename}
        />
      )}

      {phase === "ready" && (
        <main className="main-player">
          <p className="playing-filename">{filename}</p>

          <PlayerControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            loopIn={loopIn}
            loopOut={loopOut}
            onPlayPause={handlePlayPause}
            onSeek={handleSeek}
            onSetLoopIn={() => setLoopIn(currentTime)}
            onSetLoopOut={() => setLoopOut(currentTime)}
            onClearLoop={() => { setLoopIn(null); setLoopOut(null); }}
          />

          <SoundTags
            segments={segments}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
          />

          <div className="stem-list">
            {stems.map((stem) => (
              <StemTrack
                key={stem.name}
                stem={stem}
                currentTime={currentTime}
                duration={duration}
                loopIn={loopIn}
                loopOut={loopOut}
                segments={segments.filter((s) =>
                  s.tags.some((t) => t.startsWith(stem.name))
                )}
                onSeek={handleSeek}
                onMute={handleMute}
                onSolo={handleSolo}
                onVolume={handleVolume}
              />
            ))}
          </div>

          <p className="kbd-hint">Space: 재생/정지 · ← →: 5초 이동 · [IN/OUT]: 반복 구간 설정</p>
        </main>
      )}
    </div>
  );
}
