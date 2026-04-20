import { SoundSegment, StemState } from "../types";
import WaveformDisplay from "./WaveformDisplay";

interface Props {
  stem: StemState;
  currentTime: number;
  duration: number;
  loopIn: number | null;
  loopOut: number | null;
  segments: SoundSegment[];
  onSeek: (t: number) => void;
  onMute: (name: string) => void;
  onSolo: (name: string) => void;
  onVolume: (name: string, v: number) => void;
}

export default function StemTrack({
  stem,
  currentTime,
  duration,
  loopIn,
  loopOut,
  segments,
  onSeek,
  onMute,
  onSolo,
  onVolume,
}: Props) {
  const isActive = !stem.muted && stem.buffer !== null;

  return (
    <div className={`stem-track ${stem.muted ? "muted" : ""} ${stem.solo ? "solo" : ""}`}>
      <div className="stem-header">
        <span className="stem-dot" style={{ background: stem.color }} />
        <span className="stem-label">{stem.label}</span>

        <div className="stem-controls">
          <button
            className={`ctrl-btn ${stem.solo ? "active-solo" : ""}`}
            onClick={() => onSolo(stem.name)}
            title="솔로"
          >
            S
          </button>
          <button
            className={`ctrl-btn ${stem.muted ? "active-mute" : ""}`}
            onClick={() => onMute(stem.name)}
            title="뮤트"
          >
            M
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={stem.volume}
            className="volume-slider"
            onChange={(e) => onVolume(stem.name, parseFloat(e.target.value))}
          />
          <span className="volume-value">{Math.round(stem.volume * 100)}</span>
        </div>
      </div>

      <WaveformDisplay
        peaks={stem.peaks}
        currentTime={currentTime}
        duration={duration}
        color={isActive ? stem.color : "#374151"}
        loopIn={loopIn}
        loopOut={loopOut}
        segments={segments}
        height={56}
        onSeek={onSeek}
      />
    </div>
  );
}
