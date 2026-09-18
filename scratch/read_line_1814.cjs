const fs = require('fs');
const logFile = 'C:\\Users\\josenildo.santos\\.gemini\\antigravity-ide\\brain\\d4fb4850-fd59-4158-ae39-ea03f823218f\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(logFile, 'utf8').split('\n');
console.log('Line 1814 full content:');
const parsed = JSON.parse(lines[1814]);
console.log(parsed.content);
