import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import inspectionsService from '../../services/inspections';
import { IcoUpload, IcoTrash } from '../../components/ui/Icons';

interface FileItem {
  file: File;
  preview: string;
}

export default function NewInspectionPage() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [files,    setFiles]    = useState<FileItem[]>([]);
  const [dragover, setDragover] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error,    setError]    = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    productName: '',
    brand: '',
    manufacturer: '',
    batchNo: '',
    netQuantity: '',
    mrp: '',
    location: '',
    date: new Date().toISOString().slice(0, 10),
    productCategory: 'General Packaged Commodity',
    notes: '',
  });

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setForm(f => ({ ...f, [k]: e.target.value }));

  const addFiles = useCallback((incoming: File[]) => {
    const allowed = incoming.filter(f => f.type.startsWith('image/'));
    setFiles(prev => [
      ...prev,
      ...allowed.map(f => ({ file: f, preview: URL.createObjectURL(f) })),
    ]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (i: number) => {
    setFiles(prev => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, j) => j !== i);
    });
  };

  const handleSaveDraft = async () => {
    setError(null);
    setSaving(true);
    setStatusMsg('Creating inspection record…');
    try {
      const inspection = await inspectionsService.create({
        product_category: form.productCategory,
      });

      if (files.length > 0) {
        setStatusMsg(`Uploading ${files.length} evidence image(s)…`);
        await inspectionsService.uploadImages(
          inspection.id,
          files.map(f => f.file),
        );
      }

      navigate(`/inspections/${inspection.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save inspection draft. Please check your connection.');
    } finally {
      setSaving(false);
      setStatusMsg('');
    }
  };

  const handleStartAnalysis = async () => {
    if (files.length === 0) {
      setError('Please upload at least one packaging image before starting analysis.');
      return;
    }

    setError(null);
    setSaving(true);
    setStatusMsg('Creating inspection record…');
    try {
      const inspection = await inspectionsService.create({
        product_category: form.productCategory,
      });

      setStatusMsg(`Uploading ${files.length} evidence image(s)…`);
      await inspectionsService.uploadImages(
        inspection.id,
        files.map(f => f.file),
      );

      setStatusMsg('Executing OCR and LMPC compliance checks…');
      await inspectionsService.analyze(inspection.id);

      navigate(`/inspections/${inspection.id}`);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          'Analysis could not be completed. Ensure images are clear and retry.',
      );
    } finally {
      setSaving(false);
      setStatusMsg('');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">New Inspection</h1>
          <p className="page-header__sub">Create a new packaged commodity inspection record</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn--secondary" onClick={() => navigate('/inspections')} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn--secondary" onClick={handleSaveDraft} disabled={saving}>
            {saving && !statusMsg.includes('OCR') ? 'Saving…' : 'Save Draft'}
          </button>
          <button
            className="btn btn--primary"
            disabled={files.length === 0 || saving}
            onClick={handleStartAnalysis}
          >
            {saving ? statusMsg || 'Processing…' : 'Start Analysis'}
          </button>
        </div>
      </div>

      <div className="page-body" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 'var(--sp-5)', alignItems: 'start' }}>
        {/* ── Left: Form ──────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {error && (
            <div className="alert alert--error">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          {statusMsg && (
            <div className="alert alert--info">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              {statusMsg}
            </div>
          )}

          {/* Inspection Information */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">Inspection Information</div>
            </div>
            <div className="card__body">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Product Name <span className="form-required">*</span></label>
                  <input
                    className="form-input"
                    placeholder="e.g. Premium Basmati Rice"
                    value={form.productName}
                    onChange={set('productName')}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Brand Name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. India Gate"
                    value={form.brand}
                    onChange={set('brand')}
                  />
                </div>
                <div className="form-field form-col-full">
                  <label className="form-label">Manufacturer / Packer <span className="form-required">*</span></label>
                  <input
                    className="form-input"
                    placeholder="Full legal name of manufacturer or packer"
                    value={form.manufacturer}
                    onChange={set('manufacturer')}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Batch / Lot Number</label>
                  <input
                    className="form-input"
                    placeholder="e.g. BT-2026-09-A1"
                    value={form.batchNo}
                    onChange={set('batchNo')}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Net Quantity</label>
                  <input
                    className="form-input"
                    placeholder="e.g. 5 kg, 500 ml"
                    value={form.netQuantity}
                    onChange={set('netQuantity')}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">MRP (₹)</label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="0.00"
                    value={form.mrp}
                    onChange={set('mrp')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Inspection Metadata */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">Inspection Metadata</div>
            </div>
            <div className="card__body">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Inspection Location <span className="form-required">*</span></label>
                  <input
                    className="form-input"
                    placeholder="e.g. Delhi Market, Karol Bagh"
                    value={form.location}
                    onChange={set('location')}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Inspection Date <span className="form-required">*</span></label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.date}
                    onChange={set('date')}
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Product Category</label>
                  <select
                    className="form-select"
                    value={form.productCategory}
                    onChange={set('productCategory')}
                  >
                    <option>General Packaged Commodity</option>
                    <option>Food Product</option>
                    <option>Beverage</option>
                    <option>Cosmetic</option>
                    <option>Household Commodity</option>
                  </select>
                </div>
                <div className="form-field form-col-full">
                  <label className="form-label">Inspection Notes</label>
                  <textarea
                    className="form-textarea"
                    placeholder="Any field observations, market conditions, special remarks…"
                    value={form.notes}
                    onChange={set('notes')}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Upload ────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="card">
            <div className="card__header">
              <div>
                <div className="card__title">Product Label Evidence</div>
                <div className="card__sub">Upload images of the product package label</div>
              </div>
            </div>
            <div className="card__body">
              {/* Drop zone */}
              <div
                className={`upload-zone${dragover ? ' dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragover(true); }}
                onDragLeave={() => setDragover(false)}
                onDrop={onDrop}
                onClick={() => fileInput.current?.click()}
              >
                <div className="upload-zone__icon"><IcoUpload size={28} /></div>
                <div className="upload-zone__title">Drag &amp; drop images here</div>
                <div className="upload-zone__sub">or <strong style={{ color: 'var(--c-accent)' }}>browse to upload</strong></div>
                <div className="upload-zone__meta">JPG, PNG, WEBP · Maximum 15 MB per image</div>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files) addFiles(Array.from(e.target.files)); }}
              />

              {/* Previews */}
              {files.length > 0 && (
                <div className="upload-previews">
                  {files.map((f, i) => (
                    <div key={i} className="upload-thumb">
                      <img src={f.preview} alt={f.file.name} />
                      <div className="upload-thumb__name">{f.file.name}</div>
                      <div className="upload-thumb__remove" onClick={() => removeFile(i)}>×</div>
                    </div>
                  ))}
                </div>
              )}

              {files.length === 0 && (
                <p className="form-hint" style={{ marginTop: 'var(--sp-3)', textAlign: 'center' }}>
                  Minimum 1 image required to start analysis
                </p>
              )}
            </div>
            {files.length > 0 && (
              <div className="card__footer">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 'var(--fs-12)', color: 'var(--c-text-muted)' }}>
                  <span>{files.length} image{files.length > 1 ? 's' : ''} ready</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => setFiles([])}>
                    <IcoTrash size={13} /> Clear all
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Guidelines */}
          <div className="card">
            <div className="card__header"><div className="card__title">Image Guidelines</div></div>
            <div className="card__body">
              {[
                'Capture all sides with mandatory declarations',
                'Ensure the MRP, net quantity, and manufacturer details are clear',
                'Avoid glare, motion blur, and dark shadows',
                'Minimum resolution: 1MP (1024 × 768)',
                'Include batch number and manufacturing date markings',
              ].map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-3)', fontSize: 'var(--fs-12)', color: 'var(--c-text-muted)' }}>
                  <span style={{ color: 'var(--c-accent)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
