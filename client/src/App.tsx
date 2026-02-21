import { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:9009/api';

function fmtDuration(ms: number) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m${s % 60}s`;
}

function App() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState('jobs');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    fetchData(true);
    fetchSettings();
  }, []);

  const fetchData = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`${API_BASE}/cron/jobs`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const sortedJobs = data.sort((a: any, b: any) => {
        // Disabled jobs always at the bottom
        if (a.status === 'disabled' && b.status !== 'disabled') return 1;
        if (a.status !== 'disabled' && b.status === 'disabled') return -1;

        // Both are enabled (or both disabled) => Sort by next run time (ascending)
        // Jobs with nextRunAtMs = 0 (e.g. no future run) go to bottom of their group
        if (!a.nextRunAtMs) return 1;
        if (!b.nextRunAtMs) return -1;
        return a.nextRunAtMs - b.nextRunAtMs;
      });

      setJobs(sortedJobs);
      setError(null);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`);
      setSettings(await res.json());
    } catch { }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`${API_BASE}/cron/jobs/${id}/${action}`, { method: 'POST' });
      const data = await res.json();
      if (data.error) alert(data.error);
      else fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cron job? This cannot be undone.')) return;
    try {
      const res = await fetch(`${API_BASE}/cron/jobs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.error) alert(data.error);
      else fetchData();
    } catch (err: any) { alert(err.message); }
  };

  const viewRuns = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/cron/jobs/${id}/runs`);
      setRuns(await res.json());
      setIsHistoryOpen(true);
    } catch (err: any) { alert(err.message); }
  };

  const deliveryLabel = (d: any) => {
    if (!d || d.mode === 'none') return '—';
    const parts = [];
    if (d.channel) parts.push(d.channel);
    if (d.to) parts.push(d.to.length > 20 ? d.to.slice(0, 18) + '…' : d.to);
    return parts.join(' → ') || d.mode;
  };

  return (
    <div className="app-container">
      {/* ─── Nav Bar ─────────────────────────── */}
      <nav className="nav-bar">
        <div className="nav-brand">
          <h1>🦞 OpenClaw Cron</h1>
          <div className={`nav-status ${error ? 'error' : ''}`}>
            <span className="dot" />
            {error ? 'Disconnected' : 'Connected'}
          </div>
        </div>
        <div className="nav-actions">
          <button className={`tab ${view === 'jobs' ? 'active' : ''}`} onClick={() => setView('jobs')}>
            Jobs
          </button>
          <button className={`tab ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>
            Settings
          </button>
          <button className="icon-btn" onClick={() => fetchData()}>🔄</button>
        </div>
      </nav>

      {/* ─── Main Content ────────────────────── */}
      {view === 'jobs' ? (
        <div className="card">
          <div className="card-header">
            <h2>Scheduled Jobs</h2>
            {jobs.length > 0 && <span className="count">{jobs.length} jobs</span>}
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading jobs from VPS…</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📋</div>
              <p>No cron jobs found.<br />Check your connection settings.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', paddingBottom: '16px' }}>
              <table style={{ minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Job</th>
                    <th style={{ width: '18%' }}>Next Run</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '10%' }}>Duration</th>
                    <th style={{ width: '10%' }}>Delivery</th>
                    <th style={{ width: '10%' }}>Actions</th>
                    <th style={{ width: '12%' }}>Schedule</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job: any) => (
                    <tr key={job.id} className={`row-${job.status}`}>
                      <td>
                        <div className="job-name">{job.name}</div>
                        <div className="job-id">{job.id}</div>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{job.next}</td>
                      <td>
                        <span className={`status-chip ${job.status}`}>
                          <span className="status-dot" />
                          {job.status}
                        </span>
                        {job.consecutiveErrors > 0 && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--error)', marginTop: '3px' }}>
                            ⚠ {job.consecutiveErrors} consecutive error{job.consecutiveErrors > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        {fmtDuration(job.lastDurationMs)}
                      </td>
                      <td>
                        <span className={`delivery-badge ${job.delivery?.mode === 'announce' ? 'active' : ''}`}>
                          {job.delivery?.mode === 'announce' ? '📢' : '🔇'} {deliveryLabel(job.delivery)}
                        </span>
                      </td>
                      <td>
                        <div className="actions-cell" style={{ whiteSpace: 'nowrap' }}>
                          <button className="text-btn" onClick={() => setSelectedJob(job)}>Edit</button>
                          <button className="text-btn" onClick={() => handleAction(job.id, job.status === 'disabled' ? 'enable' : (job.status === 'ok' ? 'disable' : 'enable'))}>
                            {job.status === 'disabled' ? 'Enable' : (job.status === 'ok' ? 'Disable' : 'Enable')}
                          </button>
                          <button className="text-btn run" onClick={() => handleAction(job.id, 'run')}>Run</button>
                          <button className="text-btn" onClick={() => viewRuns(job.id)}>Logs</button>
                          <button className="text-btn danger" onClick={() => handleDelete(job.id)}>Delete</button>
                        </div>
                      </td>
                      <td>
                        <span className="schedule-badge">{job.schedule}</span>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{job.timezone}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <SettingsPanel settings={settings} onSave={fetchSettings} />
      )}

      {/* ─── Job Editor Modal ────────────────── */}
      {selectedJob && (
        <JobEditor job={selectedJob} onClose={() => setSelectedJob(null)} onSave={fetchData} />
      )}

      {/* ─── History Drawer ──────────────────── */}
      {isHistoryOpen && (
        <>
          <div className="drawer-overlay" onClick={() => setIsHistoryOpen(false)} />
          <div className="drawer">
            <div className="drawer-header">
              <h3>📊 Execution History</h3>
              <button className="icon-btn" onClick={() => setIsHistoryOpen(false)}>✕</button>
            </div>
            {runs.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <p>No recent runs found.</p>
              </div>
            ) : (
              runs.map((run: any, i: number) => (
                <div key={i} className="run-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600 }}>{run.timestamp || 'N/A'}</span>
                    <span className={`status-chip ${run.status === 'success' ? 'ok' : 'disabled'}`}>
                      <span className="status-dot" />{run.status}
                    </span>
                  </div>
                  <pre>{typeof run === 'string' ? run : JSON.stringify(run, null, 2)}</pre>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Settings Panel ────────────────────────────────── */
function SettingsPanel({ settings, onSave }: { settings: any; onSave: () => void }) {
  const [formData, setFormData] = useState(settings || {});
  useEffect(() => { setFormData(settings || {}); }, [settings]);

  const save = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed');
      alert('Settings saved!');
      onSave();
    } catch (err: any) {
      alert('Failed to save: ' + (err.message || 'Check backend connection'));
    }
  };

  const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div className="form-group">
      <label>{label}</label>
      {children}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );

  return (
    <div className="card settings-card">
      <h3>Connection & CLI Configuration</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <Field label="Host" hint="VPS IP / hostname. Leave empty or 'localhost' to execute commands locally.">
          <input value={formData.host || ''} onChange={e => setFormData({ ...formData, host: e.target.value })} placeholder="e.g. 192.168.1.100 (Empty = Local)" />
        </Field>

        <div className="section-divider" style={{ margin: '8px 0' }}>
          <span>🔑 SSH Credentials (Optional for Local)</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Field label="User">
            <input value={formData.user || ''} onChange={e => setFormData({ ...formData, user: e.target.value })} placeholder="root" />
          </Field>
          <Field label="Port">
            <input type="number" value={formData.port || 22} onChange={e => setFormData({ ...formData, port: parseInt(e.target.value) })} />
          </Field>
        </div>
        <Field label="Password" hint="Leave empty if using SSH key">
          <input type="password" value={formData.password || ''} onChange={e => setFormData({ ...formData, password: e.target.value })} />
        </Field>
        <Field label="SSH Private Key Path" hint="Local path to your private key">
          <input value={formData.keyPath || ''} onChange={e => setFormData({ ...formData, keyPath: e.target.value })} placeholder="~/.ssh/id_rsa" />
        </Field>

        <div className="section-divider" style={{ margin: '8px 0' }}>
          <span>⚙️ OpenClaw Settings</span>
        </div>

        <Field label="OpenClaw Binary Path" hint="Path on target machine (e.g. /opt/node/bin/openclaw) or just 'openclaw'">
          <input value={formData.openclawBin || ''} onChange={e => setFormData({ ...formData, openclawBin: e.target.value })} placeholder="openclaw" />
        </Field>
        <button className="primary" onClick={save} style={{ padding: '12px', marginTop: '8px' }}>
          Save & Connect
        </button>
      </div>
    </div>
  );
}

/* ─── Job Editor Modal ──────────────────────────────── */
function JobEditor({ job, onClose, onSave }: { job: any; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    ...job,
    message: job.message || '',
    model: job.model || '',
    timezone: job.timezone || 'Asia/Shanghai',
    deliveryMode: job.delivery?.mode || 'none',
    deliveryChannel: job.delivery?.channel || '',
    deliveryTo: job.delivery?.to || ''
  });
  const [mode, setMode] = useState(job.schedule.includes('*') ? 'cron' : 'at');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/cron/jobs/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          scheduleRaw: formData.schedule,
          model: formData.model,
          deliveryMode: formData.deliveryMode,
          deliveryChannel: formData.deliveryChannel,
          deliveryTo: formData.deliveryTo
        })
      });
      const data = await res.json();
      if (data.error) {
        if (confirm(`Edit failed: ${data.error}\n\nForce rebuild this job?`)) {
          const r2 = await fetch(`${API_BASE}/cron/jobs/${job.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...formData, scheduleRaw: formData.schedule, model: formData.model, forceRebuild: true })
          });
          const d2 = await r2.json();
          if (d2.error) alert(d2.error);
          else { onSave(); onClose(); }
        }
      } else {
        onSave();
        onClose();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <h3>Configure Cron Job</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* ── State info bar (read only) ── */}
          <div className="state-bar">
            <div className="state-item">
              <span className="state-label">Status</span>
              <span className={`status-chip ${job.status}`}>
                <span className="status-dot" />{job.status}
              </span>
            </div>
            <div className="state-item">
              <span className="state-label">Last Run</span>
              <span>{job.last}</span>
            </div>
            <div className="state-item">
              <span className="state-label">Duration</span>
              <span>{fmtDuration(job.lastDurationMs)}</span>
            </div>
            {job.consecutiveErrors > 0 && (
              <div className="state-item">
                <span className="state-label">Errors</span>
                <span style={{ color: 'var(--error)', fontWeight: 600 }}>{job.consecutiveErrors}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Name</label>
              <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <select value={formData.timezone} onChange={e => setFormData({ ...formData, timezone: e.target.value })}>
                <option value="Asia/Shanghai">Asia/Shanghai</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
                <option value="Europe/London">Europe/London</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Schedule</label>
            <div className="mode-tabs" style={{ marginBottom: '8px' }}>
              {['cron', 'at', 'every'].map(m => (
                <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <input
              style={{ fontFamily: "'SF Mono', 'Fira Code', monospace" }}
              value={formData.schedule}
              onChange={e => setFormData({ ...formData, schedule: e.target.value })}
              placeholder={mode === 'cron' ? '*/30 * * * *' : mode === 'at' ? '2026-02-21T10:00:00' : '60000'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label>Session Target</label>
              <select value={formData.target} onChange={e => setFormData({ ...formData, target: e.target.value })}>
                <option value="isolated">Isolated</option>
                <option value="main">Main Session</option>
              </select>
            </div>
            <div className="form-group">
              <label>Agent</label>
              <input value={formData.agent} onChange={e => setFormData({ ...formData, agent: e.target.value })} placeholder="main" />
            </div>
          </div>

          <div className="form-group">
            <label>Model</label>
            <input value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} placeholder="google/gemini-3-flash-preview" />
          </div>

          <div className="section-divider">
            <span>📢 Delivery</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px' }}>
            <div className="form-group">
              <label>Mode</label>
              <select value={formData.deliveryMode} onChange={e => setFormData({ ...formData, deliveryMode: e.target.value })}>
                <option value="none">None (🔇)</option>
                <option value="announce">Announce (📢)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Channel</label>
              <select value={formData.deliveryChannel} onChange={e => setFormData({ ...formData, deliveryChannel: e.target.value })}>
                <option value="">—</option>
                <option value="telegram">Telegram</option>
                <option value="feishu">Feishu</option>
                <option value="slack">Slack</option>
              </select>
            </div>
            <div className="form-group">
              <label>To</label>
              <input
                value={formData.deliveryTo}
                onChange={e => setFormData({ ...formData, deliveryTo: e.target.value })}
                placeholder="e.g. telegram:8001580257"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Instructions / Message</label>
            <textarea
              style={{ height: '180px', fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.8rem' }}
              value={formData.message}
              onChange={e => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter the prompt or instructions for the agent…"
            />
            <div className="form-hint">Uses: openclaw cron edit --message "…"</div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button className="primary" onClick={save} disabled={saving} style={{ flex: 2 }}>
              {saving ? '⏳ Saving…' : '💾 Save Configuration'}
            </button>
            <button onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
