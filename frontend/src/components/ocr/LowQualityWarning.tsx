import React from 'react';

interface LowQualityWarningProps {
  qualityScore: number; // e.g. 0.42
  issues: string[];
  onUploadBetter: () => void;
  onContinueAnyway: () => void;
}

export const LowQualityWarning: React.FC<LowQualityWarningProps> = ({
  qualityScore,
  issues,
  onUploadBetter,
  onContinueAnyway,
}) => {
  const percent = Math.round(qualityScore * 100);

  return (
    <div className="low-quality-banner">
      <div className="low-quality-icon">⚠️</div>
      <div className="low-quality-content" style={{ width: '100%' }}>
        <h4>Image quality may affect OCR accuracy</h4>
        <p>
          The automated image assessment tool scored this label at{' '}
          <strong>{percent}% optical quality</strong>. Low quality labels increase the likelihood of character misrecognition or missed statutory declarations.
        </p>

        <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
          Identified Deficiencies:
        </div>
        <ul className="low-quality-issues-list">
          {issues.map((issue, idx) => (
            <li key={idx}>{issue}</li>
          ))}
        </ul>

        <div className="low-quality-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onUploadBetter}
          >
            Upload Better Image
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onContinueAnyway}
          >
            Continue Anyway (Log Quality Warning)
          </button>
        </div>
      </div>
    </div>
  );
};
