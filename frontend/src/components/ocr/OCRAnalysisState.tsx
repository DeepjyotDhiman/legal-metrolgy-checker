import React from 'react';
import type { PipelineStage } from './types';

interface OCRAnalysisStateProps {
  stages: PipelineStage[];
  isComplete: boolean;
  detectedCount: number;
  averageConfidence: number;
  qualityScore: number;
  onViewWorkstation?: () => void;
}

export const OCRAnalysisState: React.FC<OCRAnalysisStateProps> = ({
  stages,
  isComplete,
  detectedCount,
  averageConfidence,
  qualityScore,
  onViewWorkstation,
}) => {
  return (
    <div className="ocr-workstation-container">
      <div className="pipeline-progress-card">
        {/* Header */}
        <div className="pipeline-progress-header">
          <h3>
            {isComplete ? 'OCR Analysis Complete' : 'Analyzing Product Label'}
          </h3>
          <p>
            {isComplete
              ? 'Optical recognition and statutory declaration extraction finished successfully.'
              : 'Executing deterministic text detection and Legal Metrology rule mapping pipeline.'}
          </p>
        </div>

        {/* 6-Stage Technical Pipeline Indicator */}
        <div className="pipeline-stages-list">
          {stages.map((stage, idx) => {
            let statusClass = 'stage-pending';
            let iconText: React.ReactNode = idx + 1;

            if (stage.status === 'COMPLETED') {
              statusClass = 'stage-completed';
              iconText = '✓';
            } else if (stage.status === 'ACTIVE') {
              statusClass = 'stage-active';
              iconText = '●';
            } else if (stage.status === 'FAILED') {
              statusClass = 'stage-failed';
              iconText = '✕';
            }

            return (
              <div key={stage.id} className={`pipeline-stage-item ${statusClass}`}>
                <div className="pipeline-stage-badge">{iconText}</div>
                <div className="pipeline-stage-content">
                  <div className="pipeline-stage-name">{stage.name}</div>
                  <div className="pipeline-stage-desc">{stage.description}</div>
                </div>
                <div>
                  <span
                    className={`badge-gov ${
                      stage.status === 'COMPLETED'
                        ? 'badge-gov-success'
                        : stage.status === 'ACTIVE'
                        ? 'badge-gov-primary'
                        : 'badge-gov-neutral'
                    }`}
                  >
                    {stage.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Completion Summary Card (Screen 3 requirement) */}
        {isComplete && (
          <div
            style={{
              marginTop: 'var(--space-5)',
              padding: 'var(--space-4)',
              backgroundColor: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 'var(--space-3)',
                textAlign: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Detected Lines
                </div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
                  {detectedCount}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Average OCR Conf.
                </div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: '#057a55' }}>
                  {Math.round(averageConfidence * 100)}%
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Image Quality
                </div>
                <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: '#1e429f' }}>
                  {Math.round(qualityScore * 100)}%
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                  Processing Status
                </div>
                <div style={{ marginTop: '4px' }}>
                  <span className="badge-gov badge-gov-success">Success</span>
                </div>
              </div>
            </div>

            {onViewWorkstation && (
              <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onViewWorkstation}
                >
                  Open Evidence Workstation →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
