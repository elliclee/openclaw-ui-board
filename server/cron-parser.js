function parseCronList(output) {
    // Attempt to extract JSON block from potentially messy output (e.g. with Doctor warnings)
    try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data && data.jobs) {
                return data.jobs.map(j => ({
                    id: j.id,
                    name: j.name,
                    enabled: j.enabled !== false,
                    schedule: j.schedule ? (j.schedule.expr || j.schedule.value || JSON.stringify(j.schedule)) : '',
                    timezone: (j.schedule && j.schedule.tz) ? j.schedule.tz : 'UTC',
                    next: j.state && j.state.nextRunAtMs ? new Date(j.state.nextRunAtMs).toLocaleString() : '-',
                    nextRunAtMs: j.state && j.state.nextRunAtMs ? j.state.nextRunAtMs : 0,
                    last: j.state && j.state.lastRunAtMs ? new Date(j.state.lastRunAtMs).toLocaleString() : '-',
                    status: j.enabled ? (j.state ? j.state.lastStatus : 'ok') : 'disabled',
                    target: j.sessionTarget || 'isolated',
                    agent: j.agentId || 'main',
                    message: (j.payload && j.payload.message) ? j.payload.message : '',
                    model: (j.payload && j.payload.model) ? j.payload.model : '',
                    delivery: j.delivery || { mode: 'none' },
                    consecutiveErrors: j.state ? (j.state.consecutiveErrors || 0) : 0,
                    lastDurationMs: j.state ? (j.state.lastDurationMs || 0) : 0,
                    lastError: j.state ? (j.state.lastError || '') : ''
                }));
            }
        }
    } catch (e) {
        // Fallback to table parsing
    }

    const lines = output.trim().split('\n');
    if (lines.length === 0) return [];
    // ... (rest of the table parsing logic remains as fallback)

    // Find the header line (case-insensitive)
    const headerIdx = lines.findIndex(l => {
        const up = l.toUpperCase();
        return up.includes('ID') && up.includes('NAME') && up.includes('SCHEDULE');
    });
    if (headerIdx === -1) return [];

    const header = lines[headerIdx];
    const dataLines = lines.slice(headerIdx + 1).filter(l => l.trim().length > 30); // IDs are long

    // Detect column start positions
    const getPos = (name) => {
        const idx = header.toUpperCase().indexOf(name.toUpperCase());
        return idx;
    };

    const cols = [
        { name: 'id', start: getPos('ID') },
        { name: 'name', start: getPos('Name') },
        { name: 'schedule', start: getPos('Schedule') },
        { name: 'next', start: getPos('Next') },
        { name: 'last', start: getPos('Last') },
        { name: 'status', start: getPos('Status') },
        { name: 'target', start: getPos('Target') },
        { name: 'agent', start: getPos('Agent') }
    ].sort((a, b) => a.start - b.start);

    return dataLines.map(line => {
        const job = {};
        for (let i = 0; i < cols.length; i++) {
            const start = cols[i].start;
            const end = cols[i + 1] ? cols[i + 1].start : line.length;
            job[cols[i].name] = line.slice(start, end).trim();
        }
        return job;
    }).filter(j => j.id && j.id.trim().length > 5); // Relax ID length for different versions
}

function parseCronRuns(output) {
    // If JSONL, parse each line
    try {
        return output.trim().split('\n').map(line => JSON.parse(line));
    } catch (e) {
        // If not JSONL, return as text or simplified
        return [{ raw: output }];
    }
}

module.exports = { parseCronList, parseCronRuns };
