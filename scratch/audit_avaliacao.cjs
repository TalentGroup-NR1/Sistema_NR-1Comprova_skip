const https = require('https');

https.get('https://www.nr-1pronto.com.br/assets/JSbOAfTl.js', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    // 1. Check nr1pronto vs nr-1pronto as URLs (not emails)
    console.log('=== ALL nr1pronto.com.br (not email/suporte) ===');
    let pos = 0;
    while ((pos = data.indexOf('nr1pronto.com.br', pos)) !== -1) {
      const snippet = data.substring(Math.max(0, pos - 60), Math.min(data.length, pos + 80));
      console.log(`[${pos}]`, snippet);
      pos += 16;
    }

    console.log('\n=== ALL nr-1pronto.com.br ===');
    pos = 0;
    while ((pos = data.indexOf('nr-1pronto.com.br', pos)) !== -1) {
      const snippet = data.substring(Math.max(0, pos - 60), Math.min(data.length, pos + 80));
      console.log(`[${pos}]`, snippet);
      pos += 17;
    }

    // 2. Find the avaliacao/preencher builder
    console.log('\n=== AVALIACAO/PREENCHER context ===');
    pos = 0;
    while ((pos = data.indexOf('avaliacao/preencher', pos)) !== -1) {
      const snippet = data.substring(Math.max(0, pos - 150), Math.min(data.length, pos + 100));
      console.log(`[${pos}]`, snippet);
      pos += 19;
    }

    // 3. Find PRODUCTION_URL or getShareBaseUrl result
    console.log('\n=== Qyt / PRODUCTION_URL context ===');
    pos = data.indexOf('www.nr-1pronto.com.br');
    while (pos !== -1) {
      console.log(`[${pos}]`, data.substring(Math.max(0, pos - 50), Math.min(data.length, pos + 100)));
      pos = data.indexOf('www.nr-1pronto.com.br', pos + 1);
    }
  });
});
