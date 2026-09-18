import { Link } from 'react-router-dom';

export default function InspectionsPage() {
  return (
    <div className="placeholder-page">
      <span className="placeholder-badge">Inspections</span>
      <h1>Inspections</h1>
      <p>All inspections will be listed here.</p>
      <Link to="/inspections/new" className="btn btn-primary" style={{ marginTop: 'var(--space-4)', width: 'auto' }}>
        + New Inspection
      </Link>
    </div>
  );
}
