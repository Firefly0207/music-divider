import { useRef, useState, DragEvent } from "react";

interface Props {
  onFile: (file: File, quality: "fast" | "better") => void;
  disabled: boolean;
}

const ACCEPTED = ".mp3,.wav,.flac,.m4a,.ogg,.aiff,.aif";

export default function Uploader({ onFile, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [quality, setQuality] = useState<"fast" | "better">("fast");

  const handleFile = (file: File | null) => {
    if (!file || disabled) return;
    onFile(file, quality);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  return (
    <div className="uploader-wrap">
      <div
        className={`drop-zone ${dragging ? "drag-over" : ""} ${disabled ? "disabled" : ""}`}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <div className="drop-icon">🎵</div>
        <p className="drop-title">음원 파일을 여기에 끌어다 놓거나 클릭하세요</p>
        <p className="drop-hint">MP3, WAV, FLAC, M4A 지원 · 최대 100MB · 10분</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="quality-row">
        <span className="quality-label">처리 속도</span>
        <button
          className={`quality-btn ${quality === "fast" ? "active" : ""}`}
          onClick={() => setQuality("fast")}
        >
          빠르게
        </button>
        <button
          className={`quality-btn ${quality === "better" ? "active" : ""}`}
          onClick={() => setQuality("better")}
        >
          고품질
        </button>
      </div>

      <p className="legal-note">
        ⚠ 이 도구는 개인 청취 분석 전용입니다. 저작권이 있는 음원의 재배포나 상업적 이용은 허용되지 않습니다.
      </p>
    </div>
  );
}
