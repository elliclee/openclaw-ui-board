const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.openclaw-cron-ui');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function getConfig() {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return {
      host: '',
      user: '',
      port: 22,
      password: '',
      openclawBin: 'openclaw',
      keyPath: path.join(os.homedir(), '.ssh/id_rsa'),
    };
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading config:', err);
    return {};
  }
}

function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
}

module.exports = { getConfig, saveConfig };
