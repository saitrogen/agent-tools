#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

let cdpEndpoint = 'http://127.0.0.1:9222';
const activePortPath = path.join(os.homedir(), 'Library/Application Support/Google/Chrome/DevToolsActivePort');

if (fs.existsSync(activePortPath)) {
  try {
    const lines = fs.readFileSync(activePortPath, 'utf8').trim().split('\n');
    if (lines.length >= 2) {
      cdpEndpoint = `ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`;
    }
  } catch {}
}

const args = [
  '-y',
  '@playwright/mcp@latest',
  `--cdp-endpoint=${cdpEndpoint}`,
  ...process.argv.slice(2)
];

const child = spawn('npx', args, {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Failed to start Playwright MCP:', err);
  process.exit(1);
});
