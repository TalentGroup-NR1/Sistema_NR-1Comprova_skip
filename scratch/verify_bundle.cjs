const https = require('https');

https.get('https://www.nr-1pronto.com.br/assets/JSbOAfTl.js', (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Bundle size (chars):', data.length);
    console.log('Has https://www.nr-1pronto.com.br:', data.includes('https://www.nr-1pronto.com.br'));
    console.log('Has www.nr-1pronto.com.br:', data.includes('www.nr-1pronto.com.br'));
    console.log('Has Responder button string:', data.includes('Responder'));
    console.log('Has /feedback/:', data.includes('/feedback/'));

    const idxDomain = data.indexOf('www.nr-1pronto.com.br');
    if (idxDomain !== -1) {
      console.log('Domain snippet:', data.substring(idxDomain - 20, idxDomain + 40));
    }

    // Let's find occurrences of Responder
    let pos = 0;
    while ((pos = data.indexOf('Responder', pos)) !== -1) {
      console.log('Responder snippet at', pos, ':', data.substring(pos - 40, pos + 40));
      pos += 9;
    }
  });
}).on('error', err => {
  console.error('Error fetching bundle:', err);
});
