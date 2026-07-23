import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../components/Toast';

interface ImportResult {
  total: number;
  imported: number;
  duplicated: number;
  rejected: number;
  errors: string[];
}

export default function ImportCsv() {
  const { success, error: showError, warning } = useToast();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Apenas ficheiros CSV são suportados.');
      showError('Apenas ficheiros CSV são suportados.');
      setResult(null);
      return;
    }

    setError('');
    setResult(null);
    setUploading(true);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/telemetry/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      const r = res.data as ImportResult;
      if (r.rejected === 0 && r.imported > 0) {
        success(`Importação concluída: ${r.imported} leituras registadas.`);
      } else if (r.imported > 0) {
        warning(`Importadas ${r.imported} leituras, ${r.rejected} rejeitadas.`);
      } else {
        showError('Nenhuma leitura foi importada.');
      }
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Erro ao importar ficheiro.';
      setError(message);
      showError(message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Importar CSV</h1>
          <p className="page-subtitle">Carregue um ficheiro de telemetria exportado pelo ESP32.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div
            className={`upload-zone${dragging ? ' dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={onChange}
              style={{ display: 'none' }}
            />
            {uploading ? (
              <>
                <div className="spinner" style={{ margin: '0 auto 0.75rem' }} />
                <h3>A importar {fileName}...</h3>
                <p>A validar e a registar as leituras.</p>
              </>
            ) : (
              <>
                <Upload size={40} />
                <h3>Arraste o ficheiro CSV para aqui</h3>
                <p>ou clique para selecionar · formato contrato v1.0</p>
              </>
            )}
          </div>

          {error && (
            <div className="error-message" style={{ marginTop: '1.25rem' }}>
              <XCircle size={16} /> {error}
            </div>
          )}

          {result && (
            <>
              <div className="import-summary">
                <div className="import-stat success">
                  <div className="num">{result.imported}</div>
                  <div className="lbl">Importadas</div>
                </div>
                <div className="import-stat duplicate">
                  <div className="num">{result.duplicated}</div>
                  <div className="lbl">Duplicadas (ignoradas)</div>
                </div>
                <div className="import-stat error">
                  <div className="num">{result.rejected}</div>
                  <div className="lbl">Rejeitadas</div>
                </div>
              </div>

              {result.rejected === 0 && result.imported > 0 && (
                <div className="success-message" style={{ marginTop: '1.25rem' }}>
                  <CheckCircle2 size={16} />
                  Importação concluída com sucesso — {result.imported} leituras registadas.
                </div>
              )}

              {result.errors.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div className="error-message">
                    <AlertTriangle size={16} />
                    {result.rejected} linhas rejeitadas. Primeiros erros:
                  </div>
                  <div style={{
                    background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6,
                    padding: '0.875rem 1rem', fontSize: '0.8125rem', fontFamily: 'Consolas, monospace',
                    color: 'var(--text-secondary)', maxHeight: 220, overflowY: 'auto',
                  }}>
                    {result.errors.map((e, i) => (
                      <div key={i} style={{ padding: '0.125rem 0' }}>{e}</div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Informação sobre o formato */}
      <div className="card">
        <div className="card-header">
          <h2><Info size={18} /> Formato esperado (contrato v1.0)</h2>
        </div>
        <div className="card-body">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            O ficheiro deve respeitar o contrato de telemetria. Colunas obrigatórias:
          </p>
          <div style={{
            background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
            padding: '1rem 1.25rem', fontFamily: 'Consolas, monospace', fontSize: '0.8rem',
            overflowX: 'auto', lineHeight: 1.7,
          }}>
            <div style={{ color: '#94a3b8' }}>device_id,timestamp,temp_ext_c,humidity_pct,pressure_hpa,temp_nest1_c,temp_nest2_c,weight_g,battery_mv,status_flags</div>
            <div>ESP32-001,2026-07-22T08:00:00Z,24.35,61.20,1015.3,34.50,35.10,45200,12450,OK</div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
            <FileSpreadsheet size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Leituras duplicadas (mesmo dispositivo e data/hora) são ignoradas automaticamente.
              Valores fora dos intervalos aceitáveis são rejeitados sem interromper a importação.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
