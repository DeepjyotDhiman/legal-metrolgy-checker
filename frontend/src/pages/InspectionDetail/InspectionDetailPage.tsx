import { useParams, Link } from 'react-router-dom';

export default function InspectionDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="placeholder-page">
      <span className="placeholder-badge">Inspection Detail</span>
      <h1>Inspection Detail</h1>
      <p>
        Full details for inspection <strong>{id}</strong> — images, OCR results, extracted fields
        and compliance checks will appear here.
      </p>
      <Link
        to="/inspections"
        style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}
      >
        ← Back to Inspections
      </Link>
    </div>
  );
}
