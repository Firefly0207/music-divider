interface Props {
  progress: number;
  stage: string;
  filename: string;
  onCancel?: () => void;
}

export default function ProcessingOverlay({ progress, stage, filename, onCancel }: Props) {
  return (
    <div className="processing-overlay">
      <div className="processing-card">
        <div className="processing-spinner" />
        <p className="processing-filename">{filename}</p>
        <p className="processing-stage">{stage}</p>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-percent">{progress}%</p>
        {onCancel && (
          <button className="cancel-btn" onClick={onCancel}>
            취소
          </button>
        )}
        <p className="processing-hint">
          처음 실행 시 모델 다운로드로 수 분이 걸릴 수 있습니다.
        </p>
      </div>
    </div>
  );
}
