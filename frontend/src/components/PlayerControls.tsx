interface Props {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loopIn: number | null;
  loopOut: number | null;
  onPlayPause: () => void;
  onSeek: (t: number) => void;
  onSetLoopIn: () => void;
  onSetLoopOut: () => void;
  onClearLoop: () => void;
}

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  loopIn,
  loopOut,
  onPlayPause,
  onSeek,
  onSetLoopIn,
  onSetLoopOut,
  onClearLoop,
}: Props) {
  const hasLoop = loopIn !== null && loopOut !== null;

  return (
    <div className="player-controls">
      <button className="play-btn" onClick={onPlayPause}>
        {isPlaying ? "⏸" : "▶"}
      </button>

      <span className="time-display">
        {fmt(currentTime)} / {fmt(duration)}
      </span>

      <input
        type="range"
        min={0}
        max={duration || 1}
        step={0.1}
        value={currentTime}
        className="seek-slider"
        onChange={(e) => onSeek(parseFloat(e.target.value))}
      />

      <div className="loop-controls">
        <button
          className={`loop-btn ${loopIn !== null ? "active" : ""}`}
          onClick={onSetLoopIn}
          title="반복 시작 지점 (현재 위치)"
        >
          {loopIn !== null ? `[${fmt(loopIn)}` : "[ IN"}
        </button>
        <button
          className={`loop-btn ${loopOut !== null ? "active" : ""}`}
          onClick={onSetLoopOut}
          title="반복 끝 지점 (현재 위치)"
        >
          {loopOut !== null ? `${fmt(loopOut)}]` : "OUT ]"}
        </button>
        {hasLoop && (
          <button className="loop-clear-btn" onClick={onClearLoop} title="반복 해제">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
