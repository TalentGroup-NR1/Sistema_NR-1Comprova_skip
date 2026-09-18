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
      if (line.includes('ETAPA') && (line.includes('deploy') || line.includes('Deploy') || line.includes('publicar'))) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.type === 'USER_INPUT') {
            console.log(`[USER ${conv}:${i}] ${parsed.content.slice(0, 200).replace(/\n/g, ' ')}`);
          }
        } catch(e) {}
      }
    }
  }
}
