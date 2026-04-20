import { useEffect, useRef } from "react";
import { SoundSegment, TAG_COLORS } from "../types";

interface Props {
  peaks: number[];
  currentTime: number;
  duration: number;
  color: string;
  loopIn: number | null;
  loopOut: number | null;
  segments?: SoundSegment[];
  height?: number;
  onSeek?: (time: number) => void;
}

export default function WaveformDisplay({
  peaks,
  currentTime,
  duration,
  color,
  loopIn,
  loopOut,
  segments = [],
  height = 60,
  onSeek,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 배경
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, W, H);

    // loop 구간 강조
    if (loopIn !== null && loopOut !== null && duration > 0) {
      const x1 = (loopIn / duration) * W;
      const x2 = (loopOut / duration) * W;
      ctx.fillStyle = "rgba(99,102,241,0.15)";
      ctx.fillRect(x1, 0, x2 - x1, H);
    }

    // waveform 막대
    if (peaks.length > 0) {
      const barW = W / peaks.length;
      const mid = H / 2;
      peaks.forEach((p, i) => {
        const x = i * barW;
        const barH = p * (H / 2 - 2);
        // 재생된 부분은 밝게
        const played = duration > 0 ? currentTime / duration : 0;
        const frac = i / peaks.length;
        ctx.fillStyle = frac < played ? color : `${color}55`;
        ctx.fillRect(x, mid - barH, Math.max(1, barW - 0.5), barH * 2);
      });
    }

    // sound tag dots (아래쪽에 작은 점으로 표시)
    segments.forEach((seg) => {
      if (seg.tags.length === 0) return;
      const x = (seg.time_start / duration) * W;
      const tagColor = TAG_COLORS[seg.tags[0]] ?? "#888";
      ctx.fillStyle = tagColor;
      ctx.fillRect(x, H - 4, ((seg.time_end - seg.time_start) / duration) * W, 3);
    });

    // playhead
    if (duration > 0) {
      const px = (currentTime / duration) * W;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px - 1, 0, 2, H);
    }
  }, [peaks, currentTime, duration, color, loopIn, loopOut, segments]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSeek || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const t = (x / rect.width) * duration;
    onSeek(Math.max(0, Math.min(t, duration)));
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="waveform-canvas"
      style={{ height: `${height}px` }}
      onClick={handleClick}
    />
  );
}
