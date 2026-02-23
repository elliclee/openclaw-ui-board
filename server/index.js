const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { getConfig, saveConfig } = require('./config-manager');
const { executeCommand } = require('./ssh');
const { parseCronList, parseCronRuns } = require('./cron-parser');

const app = express();
const port = 9009;

app.use(cors());
app.use(bodyParser.json());

// API Endpoints
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/settings', (req, res) => {
    res.json(getConfig());
});

app.post('/api/settings', (req, res) => {
    saveConfig(req.body);
    res.json({ message: 'Settings saved' });
});

app.get('/api/cron/jobs', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        const output = await executeCommand(`${bin} cron list --json --all`);
        console.log('LIST OUTPUT:', output);
        const jobs = parseCronList(output);
        console.log('PARSED JOBS COUNT:', jobs.length);
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cron/jobs/:id/enable', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        await executeCommand(`${bin} cron enable ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cron/jobs/:id/disable', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        await executeCommand(`${bin} cron disable ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cron/jobs/:id/run', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        await executeCommand(`${bin} cron run ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/cron/jobs/:id', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        await executeCommand(`${bin} cron rm ${req.params.id}`);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/cron/jobs/:id/runs', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        const output = await executeCommand(`${bin} cron runs --id ${req.params.id} --limit 200 --format jsonl`);
        const runs = parseCronRuns(output);
        res.json(runs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/cron/status', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        const output = await executeCommand(`${bin} cron status`);
        res.json({ raw: output });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/cron/jobs/:id', async (req, res) => {
    const { id } = req.params;
    const { name, scheduleRaw, timezone, target, agent, message, model, payloadKind, sessionTarget, deliveryMode, deliveryChannel, deliveryTo } = req.body;

    try {
        const bin = getConfig().openclawBin || 'openclaw';
        let patchCmd = `${bin} cron edit ${id}`;
        if (name) patchCmd += ` --name "${name}"`;
        if (scheduleRaw) {
            if (scheduleRaw.includes('*')) patchCmd += ` --cron "${scheduleRaw}"`;
            else if (scheduleRaw.match(/^\d+/) && !scheduleRaw.includes('-')) patchCmd += ` --every "${scheduleRaw}"`;
            else patchCmd += ` --at "${scheduleRaw}"`;
        }
        if (timezone) patchCmd += ` --tz "${timezone}"`;
        if (agent) patchCmd += ` --agent "${agent}"`;
        if (message) patchCmd += ` --message "${message}"`;
        if (model) patchCmd += ` --model "${model}"`;
        // Delivery options
        if (deliveryMode === 'announce') patchCmd += ` --announce`;
        else if (deliveryMode === 'none') patchCmd += ` --no-deliver`;
        if (deliveryChannel) patchCmd += ` --channel "${deliveryChannel}"`;
        if (deliveryTo) patchCmd += ` --to "${deliveryTo}"`;

        try {
            await executeCommand(patchCmd);
            res.json({ success: true, method: 'patch' });
        } catch (editErr) {
            if (req.body.forceRebuild) {
                await executeCommand(`${bin} cron rm ${id}`);
                let addCmd = `${bin} cron add --name "${name || 'Rebuilt Job'}"`;
                if (scheduleRaw) {
                    if (scheduleRaw.includes('*')) addCmd += ` --cron "${scheduleRaw}"`;
                    else if (scheduleRaw.match(/^\d+/) && !scheduleRaw.includes('-')) addCmd += ` --every "${scheduleRaw}"`;
                    else addCmd += ` --at "${scheduleRaw}"`;
                }
                if (timezone) addCmd += ` --tz "${timezone}"`;
                if (agent) addCmd += ` --agent "${agent}"`;
                if (message) addCmd += ` --message "${message}"`;
                const sTarget = target || sessionTarget;
                if (sTarget) addCmd += ` --session ${sTarget}`;

                await executeCommand(addCmd);
                res.json({ success: true, method: 'rebuild' });
            } else {
                throw editErr;
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Agents API ---

function extractJson(output) {
    try {
        const str = output.trim();
        const firstBracket = str.indexOf('[');
        const firstBrace = str.indexOf('{');
        const start = (firstBracket !== -1 && firstBrace !== -1) ? Math.min(firstBracket, firstBrace) : Math.max(firstBracket, firstBrace);
        if (start !== -1) {
            const lastBracket = str.lastIndexOf(']');
            const lastBrace = str.lastIndexOf('}');
            const end = (lastBracket !== -1 && lastBrace !== -1) ? Math.max(lastBracket, lastBrace) : Math.max(lastBracket, lastBrace);
            if (end !== -1 && end >= start) {
                return JSON.parse(str.substring(start, end + 1));
            }
        }
    } catch (e) { }
    return JSON.parse(output); // Fallback
}

app.get('/api/agents', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        const output = await executeCommand(`${bin} agents list --json`);
        res.json(extractJson(output));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/agents', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        const { name, workspace, model } = req.body;
        const activeName = (name || 'New Agent').replace(/"/g, '');
        const activeWorkspace = workspace ? `"${workspace}"` : `~/.openclaw/agents/${activeName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()}/agent`;
        let cmd = `${bin} agents add "${activeName}" --workspace ${activeWorkspace} --agent-dir ${activeWorkspace} --non-interactive --json`;
        if (model) cmd += ` --model "${model}"`;

        // 1. Add agent
        const output = await executeCommand(cmd);

        // 2. Ensure auth & models files are copied over so it's "configured: true"
        const copyCmd = `mkdir -p ${activeWorkspace}/agent && cp ~/.openclaw/agents/main/agent/{auth.json,models.json,auth-profiles.json} ${activeWorkspace}/agent/ 2>/dev/null || true`;
        await executeCommand(copyCmd);

        // 3. Restart the generic gateway to ensure the new agent list is loaded in memory
        await executeCommand('systemctl --user restart openclaw-gateway || true');

        res.json(extractJson(output));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.patch('/api/agents/:id', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        const { id } = req.params;
        const { name, emoji, theme, avatar } = req.body;
        let cmd = `${bin} agents set-identity --agent "${id}" --json`;
        if (name) cmd += ` --name "${name}"`;
        if (emoji) cmd += ` --emoji "${emoji}"`;
        if (theme) cmd += ` --theme "${theme}"`;
        if (avatar) cmd += ` --avatar "${avatar}"`;

        const output = await executeCommand(cmd);
        res.json(extractJson(output));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/agents/:id', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        const { id } = req.params;
        const output = await executeCommand(`${bin} agents delete "${id}" --force --json`);
        res.json(extractJson(output));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cli/probe', async (req, res) => {
    try {
        const bin = getConfig().openclawBin || 'openclaw';
        const subcommands = ['edit', 'add', 'runs'];
        const results = {};
        for (const cmd of subcommands) {
            try {
                results[cmd] = await executeCommand(`${bin} cron ${cmd} --help`);
            } catch (e) {
                results[cmd] = 'Error: ' + e.message;
            }
        }
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, '127.0.0.1', () => {
    console.log(`OpenClaw Cron UI server running at http://localhost:${port}`);
});
