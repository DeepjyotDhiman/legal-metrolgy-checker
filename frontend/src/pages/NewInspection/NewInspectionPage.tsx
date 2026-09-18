import { useNavigate } from 'react-router-dom';

export default function NewInspectionPage() {
  const navigate = useNavigate();

  return (
    <div className="placeholder-page">
      <span className="placeholder-badge">New Inspection</span>
      <h1>New Inspection</h1>
      <p>The image upload and inspection creation form will appear here.</p>
      <button
        className="btn btn-ghost"
        style={{ marginTop: 'var(--space-4)' }}
        onClick={() => navigate('/inspections')}
      >
        ← Back to Inspections
      </button>
    </div>
  );
}
