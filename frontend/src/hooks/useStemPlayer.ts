/**
 * Web Audio API 기반 멀티트랙 재생 엔진.
 * 모든 stem을 동기화해서 재생. GainNode로 개별 볼륨/뮤트 제어.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { StemState } from "../types";

export function useStemPlayer(duration: number) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainNodes = useRef<Map<string, GainNode>>(new Map());
  const sources = useRef<Map<string, AudioBufferSourceNode>>(new Map());

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // ref로 RAF 클로저의 stale capture 방지
  const isPlayingRef = useRef(false);

  const playStartAt = useRef(0);
  const offsetRef = useRef(0);
  const rafRef = useRef<number>(0);

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const stopRaf = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
  }, []);

  // isPlayingRef를 이용해 stale closure 없이 RAF 실행
  const startRaf = useCallback(() => {
    const tick = () => {
      const ctx = ctxRef.current;
      if (!ctx || !isPlayingRef.current) return;
      const elapsed = ctx.currentTime - playStartAt.current;
      const t = offsetRef.current + elapsed;
      setCurrentTime(Math.min(t, duration));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [duration]);

  // onended 핸들러를 먼저 제거해서 의도적 stop이 상태를 리셋하지 않도록 방지
  const stopSources = useCallback(() => {
    sources.current.forEach((src) => {
      src.onended = null;
      try { src.stop(); } catch {}
      src.disconnect();
    });
    sources.current.clear();
  }, []);

  const play = useCallback(
    (stems: StemState[], offset?: number) => {
      const ctx = getCtx();
      if (ctx.state === "suspended") ctx.resume();

      const startOffset = offset ?? offsetRef.current;
      offsetRef.current = startOffset;

      stopSources();

      stems.forEach((stem) => {
        if (!stem.buffer) return;

        let gain = gainNodes.current.get(stem.name);
        if (!gain) {
          gain = ctx.createGain();
          gain.connect(ctx.destination);
          gainNodes.current.set(stem.name, gain);
        }
        gain.gain.setValueAtTime(stem.muted ? 0 : stem.volume, ctx.currentTime);

        const src = ctx.createBufferSource();
        src.buffer = stem.buffer;
        src.connect(gain);
        src.start(0, startOffset);
        src.onended = () => {
          sources.current.delete(stem.name);
          if (sources.current.size === 0) {
            isPlayingRef.current = false;
            setIsPlaying(false);
            offsetRef.current = 0;
            setCurrentTime(0);
          }
        };
        sources.current.set(stem.name, src);
      });

      playStartAt.current = ctx.currentTime;
      isPlayingRef.current = true;
      setIsPlaying(true);
    },
    [getCtx, stopSources]
  );

  const pause = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    offsetRef.current = offsetRef.current + (ctx.currentTime - playStartAt.current);
    stopSources();
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [stopSources]);

  const seek = useCallback(
    (time: number, stems: StemState[], playing: boolean) => {
      offsetRef.current = time;
      setCurrentTime(time);
      if (playing) {
        play(stems, time);
      }
    },
    [play]
  );

  const updateGain = useCallback((stemName: string, volume: number, muted: boolean) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    let gain = gainNodes.current.get(stemName);
    if (!gain) {
      gain = ctx.createGain();
      gain.connect(ctx.destination);
      gainNodes.current.set(stemName, gain);
    }
    gain.gain.setValueAtTime(muted ? 0 : volume, ctx.currentTime);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      startRaf();
    } else {
      stopRaf();
    }
    return stopRaf;
  }, [isPlaying, startRaf, stopRaf]);

  useEffect(() => {
    return () => {
      stopSources();
      stopRaf();
      ctxRef.current?.close();
    };
  }, [stopSources, stopRaf]);

  return { currentTime, isPlaying, play, pause, seek, updateGain, getCtx };
}
