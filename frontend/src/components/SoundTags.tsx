import { SoundSegment, TAG_COLORS, TAG_LABELS } from "../types";

interface Props {
  segments: SoundSegment[];
  currentTime: number;
  duration: number;
  onSeek: (t: number) => void;
}

export default function SoundTags({ segments, currentTime, duration, onSeek }: Props) {
  if (segments.length === 0) return null;

  // 현재 재생 중인 구간의 태그 추출
  const currentSeg = segments.find(
    (s) => currentTime >= s.time_start && currentTime < s.time_end
  );

  return (
    <div className="sound-tags-wrap">
      <div className="tag-timeline">
        {segments.map((seg) => {
          const left = duration > 0 ? (seg.time_start / duration) * 100 : 0;
          const width = duration > 0 ? ((seg.time_end - seg.time_start) / duration) * 100 : 0;
          const tag = seg.tags[0];
          return (
            <div
              key={seg.index}
              className="tag-segment"
              style={{
                left: `${left}%`,
                width: `${width}%`,
                background: tag ? `${TAG_COLORS[tag]}33` : "transparent",
                borderTop: tag ? `2px solid ${TAG_COLORS[tag]}` : "none",
              }}
              onClick={() => onSeek(seg.time_start)}
              title={seg.tags.map((t) => TAG_LABELS[t] ?? t).join(", ")}
            />
          );
        })}
      </div>

      {currentSeg && currentSeg.tags.length > 0 && (
        <div className="current-tags">
          {currentSeg.tags.map((tag) => (
            <span
              key={tag}
              className="tag-pill"
              style={{ background: TAG_COLORS[tag] ?? "#888" }}
            >
              {TAG_LABELS[tag] ?? tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
