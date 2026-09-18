const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\josenildo.santos\\.gemini\\antigravity-ide\\brain';
const convs = fs.readdirSync(brainDir);

for (const conv of convs) {
  if (conv === 'tempmediaStorage') continue;
  const logFile = path.join(brainDir, conv, '.system_generated', 'logs', 'transcript.jsonl');
  if (fs.existsSync(logFile)) {
    const lines = fs.readFileSync(logFile, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toLowerCase().includes('hostinger') || line.toLowerCase().includes('purge everything')) {
        try {
          const parsed = JSON.parse(line);
          const text = typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.tool_calls || '');
          console.log(`[${conv}:${i}] ${text.slice(0, 300)}`);
        } catch(e) {}
      }
    }
  }
}
