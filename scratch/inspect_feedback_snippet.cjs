const https = require('https');

https.get('https://www.nr-1pronto.com.br/assets/JSbOAfTl.js', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Snippet around 1366161:');
    console.log(data.substring(1366161 - 200, 1366161 + 500));
  });
});
