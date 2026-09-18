const fs = require('fs');
const logFile = 'C:\\Users\\josenildo.santos\\.gemini\\antigravity-ide\\brain\\d4fb4850-fd59-4158-ae39-ea03f823218f\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(logFile, 'utf8').split('\n');

for (let i = 1750; i < 1810; i++) {
  try {
    const parsed = JSON.parse(lines[i]);
    if (parsed.type === 'USER_INPUT') {
      console.log(`\n--- [Line ${i}] USER_INPUT ---:\n`, parsed.content);
    } else if (parsed.type === 'PLANNER_RESPONSE' && parsed.tool_calls) {
      for (const tc of parsed.tool_calls) {
        if (tc.name === 'run_command') {
          console.log(`[Line ${i}] run_command:`, tc.arguments?.CommandLine);
        }
      }
    }
  } catch(e) {}
}
