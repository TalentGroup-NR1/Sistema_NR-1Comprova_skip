const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\josenildo.santos\\.gemini\\antigravity-ide\\brain';
const convs = fs.readdirSync(brainDir);

for (const conv of convs) {
  if (conv === '179afb94-8f38-43b1-aede-58e4c9eedc3a' || conv === 'tempmediaStorage') continue;
  const logFile = path.join(brainDir, conv, '.system_generated', 'logs', 'transcript.jsonl');
  if (fs.existsSync(logFile)) {
    const lines = fs.readFileSync(logFile, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('purge') || line.toLowerCase().includes('cloudflare') || line.toLowerCase().includes('servidor de origem')) {
        try {
          const parsed = JSON.parse(line);
          const text = typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.tool_calls || '');
          if (text.toLowerCase().includes('purge') || text.toLowerCase().includes('servidor de origem')) {
            console.log(`[${conv}:${i}] ${text.slice(0, 300)}`);
          }
        } catch(e) {}
      }
    }
  }
}
