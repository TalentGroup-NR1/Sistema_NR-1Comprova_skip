const fs = require('fs'); 
const text = fs.readFileSync('adendo-lite.json', 'utf8'); 
const data = JSON.parse(text); 
const responseText = data.candidates[0].content.parts[0].text; 
let jsonPart = responseText; 
if (responseText.includes('```json')) { 
  jsonPart = responseText.split('```json')[1].split('```')[0]; 
} 
const parsed = JSON.parse(jsonPart); 
const obj = Array.isArray(parsed) ? parsed[0] : parsed;
const riscos = obj.riscos || []; 
const acoes = obj.acoes || []; 
console.log(`Riscos: ${riscos.length}, Acoes: ${acoes.length}`); 
console.log('Riscos:', JSON.stringify(riscos.slice(0,3), null, 2)); 
console.log('Acoes:', JSON.stringify(acoes.slice(0,3), null, 2));
