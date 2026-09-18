const fs = require('fs');
const path = require('path');

const brainDir = 'C:\\Users\\josenildo.santos\\.gemini\\antigravity-ide\\brain';
const convs = ['1f8a030a-8799-4630-ac58-4a15b458ce17', '2e509068-e442-4042-b9d8-6bdc3f3fc742', '4020b74f-0bf5-4baa-905d-054f073307c2', '81fb2937-ed29-4a75-a6df-3515fdaface2'];

for (const conv of convs) {
  const logFile = path.join(brainDir, conv, '.system_generated', 'logs', 'transcript.jsonl');
  if (fs.existsSync(logFile)) {
    const lines = fs.readFileSync(logFile, 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('git push') || line.includes('PUBLICAÇÃO') || line.includes('PURGE CLOUDFLARE') || line.includes('servidor de origem')) {
        try {
          const parsed = JSON.parse(line);
          const text = typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.tool_calls || '');
          console.log(`[${conv}:${i}] ${text.slice(0, 250)}`);
        } catch(e) {}
      }
    }
  }
}
