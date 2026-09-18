import React from 'react';

interface OCRErrorStateProps {
  onRetry: () => void;
  onUploadAnother: () => void;
}

export const OCRErrorState: React.FC<OCRErrorStateProps> = ({
  onRetry,
  onUploadAnother,
}) => {
  return (
    <div className="ocr-error-card">
      <div className="ocr-error-icon-wrapper">
        ✕
      </div>

      <h3 className="ocr-error-title">OCR Analysis Could Not Be Completed</h3>
      <p className="ocr-error-reason">
        The uploaded packaging image could not be processed by the character recognition engine.
        This can occur if the file is corrupted, truncated during network upload, or encoded in an unsupported compression profile.
      </p>

      <div className="ocr-error-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onRetry}
        >
          Retry Analysis
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onUploadAnother}
        >
          Upload Another Image
        </button>
      </div>
    </div>
  );
};
