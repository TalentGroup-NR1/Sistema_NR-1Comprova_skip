const https = require('https');

https.get('https://www.nr-1pronto.com.br/assets/JSbOAfTl.js', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Snippet around 660918:');
    console.log(data.substring(660918 - 300, 660918 + 400));
  });
});
