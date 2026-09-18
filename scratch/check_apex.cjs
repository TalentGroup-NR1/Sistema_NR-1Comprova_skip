async function checkApex() {
  const url = 'https://nr-1pronto.com.br';
  const res = await fetch(url, { redirect: 'follow' });
  console.log('Final URL:', res.url);
  console.log('Status:', res.status);
  console.log('CF-Ray:', res.headers.get('cf-ray'));
  console.log('CF-Cache-Status:', res.headers.get('cf-cache-status'));
  const html = await res.text();
  const scriptMatches = [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/g)].map(m => m[1]);
  console.log('Apex scripts:', scriptMatches);
}
checkApex();
