const { Client } = require('ssh2');
const fs = require('fs');
const { exec } = require('child_process');
const { getConfig } = require('./config-manager');

async function executeCommand(command) {
    const config = getConfig();

    // Local execution bypass
    const isLocal = !config.host || config.host === 'localhost' || config.host === '127.0.0.1';

    if (isLocal) {
        return new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Command failed with code ${error.code}. Stderr: ${stderr}`));
                } else {
                    resolve(stdout);
                }
            });
        });
    }

    // Remote SSH execution
    if (!config.user) {
        throw new Error('SSH configuration is incomplete. Please configure host and user in Settings (or use localhost).');
    }

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    let lastErr = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                const conn = new Client();
                let stdout = '';
                let stderr = '';

                conn.on('ready', () => {
                    conn.exec(command, (err, stream) => {
                        if (err) {
                            conn.end();
                            return reject(err);
                        }
                        stream.on('close', (code, signal) => {
                            conn.end();
                            if (code !== 0 && code !== null) {
                                reject(new Error(`Command failed with code ${code}. Stderr: ${stderr}`));
                            } else {
                                resolve(stdout);
                            }
                        }).on('data', (data) => {
                            stdout += data.toString();
                        }).stderr.on('data', (data) => {
                            stderr += data.toString();
                        });
                    });
                }).on('error', (err) => {
                    reject(err);
                }).connect({
                    host: config.host,
                    port: config.port || 22,
                    username: config.user,
                    password: config.password || undefined,
                    privateKey: (!config.password && config.keyPath) ? fs.readFileSync(config.keyPath) : undefined
                });
            });
        } catch (err) {
            lastErr = err;
            if (err.message && err.message.includes('Connection lost before handshake')) {
                await sleep(500 * attempt); // wait before retry
            } else {
                throw err; // don't retry normal command execution errors (e.g. invalid arguments)
            }
        }
    }

    throw lastErr;
}

module.exports = { executeCommand };
