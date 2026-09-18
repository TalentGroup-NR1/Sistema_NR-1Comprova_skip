const fs = require('fs');
const logFile = 'C:\\Users\\josenildo.santos\\.gemini\\antigravity-ide\\brain\\d4fb4850-fd59-4158-ae39-ea03f823218f\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(logFile, 'utf8').split('\n');
console.log('Total lines:', lines.length);

for (let i = Math.max(0, 1820 - 20); i < Math.min(lines.length, 1820 + 20); i++) {
  try {
    const parsed = JSON.parse(lines[i]);
    if (parsed.type === 'USER_INPUT') {
      console.log(`\n--- [Line ${i}] USER_INPUT ---:\n`, parsed.content);
    } else if (parsed.type === 'PLANNER_RESPONSE') {
      console.log(`\n--- [Line ${i}] PLANNER_RESPONSE ---:\n`, typeof parsed.content === 'string' ? parsed.content.slice(0, 500) : '');
      if (parsed.tool_calls) {
        console.log('Tool calls:', parsed.tool_calls.map(tc => ({ name: tc.name, cmd: tc.arguments?.CommandLine })));
      }
    }
  } catch(e) {}
}
