import { useParams, Link } from 'react-router-dom';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="placeholder-page">
      <span className="placeholder-badge">Report</span>
      <h1>Report Detail</h1>
      <p>
        Full report <strong>{id}</strong> — compliance summary and extracted data will appear here.
      </p>
      <Link
        to="/reports"
        style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}
      >
        ← Back to Reports
      </Link>
    </div>
  );
}
