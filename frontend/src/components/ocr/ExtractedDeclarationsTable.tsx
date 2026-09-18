import React from 'react';
import type { StatutoryField } from './types';

interface ExtractedDeclarationsTableProps {
  fields: StatutoryField[];
  onViewEvidence: (field: StatutoryField) => void;
}

export const ExtractedDeclarationsTable: React.FC<ExtractedDeclarationsTableProps> = ({
  fields,
  onViewEvidence,
}) => {
  return (
    <div className="declarations-card">
      <div className="declarations-card-header">
        <h3>Extracted Declarations</h3>
        <p>
          Fields detected from the product label under the Legal Metrology (Packaged Commodities) Rules, 2011.
          Confidence scores reflect optical character recognition accuracy, not legal compliance validity.
        </p>
      </div>

      <div className="declarations-table-wrapper">
        <table className="declarations-table">
          <thead>
            <tr>
              <th>Declaration</th>
              <th>Extracted Value</th>
              <th>OCR Confidence</th>
              <th>Evidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => {
              const confPercent = Math.round(field.confidence * 100);
              const isDetected = field.status === 'DETECTED';
              const isLowConf = field.status === 'LOW_CONFIDENCE';

              let confClass = 'confidence-high';
              if (confPercent < 70) confClass = 'confidence-low';
              else if (confPercent < 90) confClass = 'confidence-mid';

              return (
                <tr key={field.key}>
                  <td className="declaration-field-name">{field.label}</td>
                  <td className="declaration-value-cell">
                    {field.value ? (
                      field.value
                    ) : (
                      <span className="declaration-missing">Not detected</span>
                    )}
                  </td>
                  <td>
                    {field.value ? (
                      <span className={`confidence-chip ${confClass}`} title="Optical recognition confidence">
                        {confPercent}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>—</span>
                    )}
                  </td>
                  <td>
                    {field.bbox ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '2px 8px', fontSize: 'var(--font-size-xs)' }}
                        onClick={() => onViewEvidence(field)}
                      >
                        View Evidence ↗
                      </button>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>No Box</span>
                    )}
                  </td>
                  <td>
                    {isDetected && (
                      <span className="badge-gov badge-gov-success">Detected</span>
                    )}
                    {isLowConf && (
                      <span className="badge-gov badge-gov-warning">
                        Low confidence — Review required
                      </span>
                    )}
                    {field.status === 'NOT_DETECTED' && (
                      <span className="badge-gov badge-gov-neutral">Not detected</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
