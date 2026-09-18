const fs = require('fs');
const logFile = 'C:\\Users\\josenildo.santos\\.gemini\\antigravity-ide\\brain\\d4fb4850-fd59-4158-ae39-ea03f823218f\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(logFile, 'utf8').split('\n');

for (let i = 1772; i <= 1798; i++) {
  try {
    const parsed = JSON.parse(lines[i]);
    if (parsed.type === 'PLANNER_RESPONSE') {
      const tc = parsed.tool_calls;
      if (tc) {
        console.log(`Line ${i} tool calls:`, JSON.stringify(tc));
      }
      if (parsed.content) {
        console.log(`Line ${i} text:`, parsed.content.slice(0, 300));
      }
    }
  } catch(e) {}
}
