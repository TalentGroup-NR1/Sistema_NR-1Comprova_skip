const https = require('https');

https.get('https://www.nr-1pronto.com.br/assets/JSbOAfTl.js', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Bundle length:', data.length);
    
    // Find all occurrences of nr-1pronto
    console.log('\n--- OCCURRENCES OF nr-1pronto ---');
    let pos = 0;
    let countHifen = 0;
    while ((pos = data.indexOf('nr-1pronto', pos)) !== -1) {
      countHifen++;
      console.log(`[${countHifen}] at ${pos}: ${data.substring(Math.max(0, pos - 30), Math.min(data.length, pos + 50))}`);
      pos += 10;
    }

    // Find all occurrences of nr1pronto (without hyphen)
    console.log('\n--- OCCURRENCES OF nr1pronto (WITHOUT hyphen) ---');
    pos = 0;
    let countNoHifen = 0;
    while ((pos = data.indexOf('nr1pronto', pos)) !== -1) {
      countNoHifen++;
      console.log(`[${countNoHifen}] at ${pos}: ${data.substring(Math.max(0, pos - 30), Math.min(data.length, pos + 50))}`);
      pos += 9;
    }
  });
});
