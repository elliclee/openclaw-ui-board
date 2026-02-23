import { useState, useEffect } from 'react';
import { RefreshCw, Trash2, Edit2, Plus, Bot, X } from 'lucide-react';

const API_BASE = 'http://localhost:9009/api';

export default function AgentsPanel() {
    const [agents, setAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<any>(null);
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    useEffect(() => {
        fetchAgents(true);
    }, []);

    const fetchAgents = async (showLoading = false) => {
        try {
            if (showLoading) setLoading(true);
            const res = await fetch(`${API_BASE}/agents`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setAgents(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(`Are you sure you want to delete agent "${id}" and wipe its workspace?`)) return;
        try {
            setLoadingAction(`del-${id}`);
            const res = await fetch(`${API_BASE}/agents/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) alert(data.error);
            else fetchAgents();
        } catch (err: any) { alert(err.message); }
        finally { setLoadingAction(null); }
    };

    return (
        <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ margin: 0 }}>OpenClaw Agents</h2>
                    {agents.length > 0 && <span className="count">{agents.length} agents</span>}
                </div>
                <button className="primary" onClick={() => setShowAddModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Plus size={16} /> New Agent
                </button>
            </div>

            {loading ? (
                <div className="loading-state">
                    <RefreshCw className="spinner" size={24} />
                    <p>Loading agents…</p>
                </div>
            ) : error ? (
                <div className="empty-state">
                    <p style={{ color: 'var(--error)' }}>Error: {error}</p>
                </div>
            ) : agents.length === 0 ? (
                <div className="empty-state">
                    <div className="icon"><Bot size={48} /></div>
                    <p>No agents configured yet.<br />Click "New Agent" to create one.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', padding: '16px 20px' }}>
                    {agents.map((agent) => (
                        <div key={agent.id} style={{
                            background: 'var(--bg-element)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ fontSize: '2rem', lineHeight: 1 }}>{agent.identityEmoji || '🤖'}</div>
                                    <div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {agent.identityName || agent.id}
                                            {agent.isDefault && <span style={{ fontSize: '0.65rem', marginLeft: '8px', background: 'var(--status-ok-bg)', color: 'var(--status-ok)', padding: '2px 4px', borderRadius: '4px' }}>Default</span>}
                                        </div>
                                        <div className="job-id" style={{ marginTop: '4px' }}>{agent.id}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button className="icon-btn" title="Edit Identity" onClick={() => setShowEditModal(agent)}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        className="icon-btn danger"
                                        title="Delete Agent"
                                        onClick={() => handleDelete(agent.id)}
                                        disabled={loadingAction === `del-${agent.id}`}
                                    >
                                        {loadingAction === `del-${agent.id}` ? <RefreshCw size={16} className="spinner" /> : <Trash2 size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ minWidth: '80px', color: 'var(--text-muted)' }}>Model:</span>
                                    <span style={{ background: 'var(--bg-wrapper)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>{agent.model || 'inherited'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ minWidth: '80px', color: 'var(--text-muted)' }}>Workspace:</span>
                                    <span style={{ wordBreak: 'break-all', fontFamily: "'SF Mono', monospace", fontSize: '0.75rem' }}>{agent.workspace}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && <AgentAddModal onClose={() => setShowAddModal(false)} onSave={fetchAgents} />}
            {showEditModal && <AgentEditModal agent={showEditModal} onClose={() => setShowEditModal(null)} onSave={fetchAgents} />}
        </div>
    );
}

function AgentAddModal({ onClose, onSave }: any) {
    const [formData, setFormData] = useState({ name: '', workspace: '', model: '' });
    const [saving, setSaving] = useState(false);
    const [successAgentName, setSuccessAgentName] = useState<string | null>(null);

    const save = async () => {
        if (!formData.name) return alert('Agent Name/ID is required');
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/agents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            onSave();
            setSuccessAgentName(formData.name.replace(/"/g, ''));
        } catch (e: any) {
            alert(e.message);
            setSaving(false);
        }
    };

    if (successAgentName) {
        return (
            <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '500px' }}>
                    <div className="card-header">
                        <h2>Agent Created Successfully</h2>
                        <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                    </div>
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ background: 'rgba(0,255,100,0.1)', color: 'var(--text-primary)', padding: '12px', borderRadius: 'var(--radius-sm)', borderLeft: '4px solid var(--accent)' }}>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>
                                The agent <strong>{successAgentName}</strong> was created and configured.
                                By default, the main agent may not have permission to spawn it.
                            </p>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                To allowlist this agent, run the following command in your server terminal:
                            </p>
                            <div style={{ background: 'var(--bg-main)', padding: '8px 12px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all', userSelect: 'all' }}>
                                openclaw config set 'agents.list[0].subagents.allowAgents' '["{successAgentName}"]'
                            </div>
                        </div>
                        <button className="primary" onClick={onClose} style={{ marginTop: '8px' }}>
                            Done
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div className="card-header">
                    <h2>Create New Agent</h2>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label>Agent Name / ID *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. ops-agent"
                        />
                    </div>
                    <div className="form-group">
                        <label>Workspace Path (Optional)</label>
                        <input
                            type="text"
                            value={formData.workspace}
                            onChange={e => setFormData({ ...formData, workspace: e.target.value })}
                            placeholder="e.g. /root/agents/ops"
                        />
                        <div className="form-hint">Omit to use default generation</div>
                    </div>
                    <div className="form-group">
                        <label>Model (Optional)</label>
                        <input
                            type="text"
                            value={formData.model}
                            onChange={e => setFormData({ ...formData, model: e.target.value })}
                            placeholder="e.g. anthropic/claude-3-5-sonnet"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button className="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
                            {saving ? 'Creating...' : 'Create Agent'}
                        </button>
                        <button onClick={onClose} disabled={saving}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AgentEditModal({ agent, onClose, onSave }: any) {
    const [formData, setFormData] = useState({
        name: agent.identityName || '',
        emoji: agent.identityEmoji || '',
        theme: '',
        avatar: ''
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/agents/${agent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            onSave();
            onClose();
        } catch (e: any) {
            alert(e.message);
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '400px' }}>
                <div className="card-header">
                    <h2>Edit Identity: {agent.id}</h2>
                    <button className="icon-btn" onClick={onClose}><X size={20} /></button>
                </div>
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                        <label>Display Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Clawy"
                        />
                    </div>
                    <div className="form-group">
                        <label>Emoji</label>
                        <input
                            type="text"
                            value={formData.emoji}
                            onChange={e => setFormData({ ...formData, emoji: e.target.value })}
                            placeholder="e.g. 🦞"
                        />
                    </div>
                    <div className="form-hint" style={{ marginTop: '-8px' }}>Note: Changing Workspace or Model requires CLI currently.</div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <button className="primary" onClick={save} disabled={saving} style={{ flex: 1 }}>
                            {saving ? 'Saving...' : 'Save Identity'}
                        </button>
                        <button onClick={onClose} disabled={saving}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
