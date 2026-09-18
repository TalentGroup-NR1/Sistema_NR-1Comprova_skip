async function checkDirect() {
  const url = 'https://www.nr-1pronto.com.br';
  const res = await fetch(url);
  console.log('Status:', res.status);
  console.log('CF-Ray:', res.headers.get('cf-ray'));
  console.log('CF-Cache-Status:', res.headers.get('cf-cache-status'));
  console.log('Age:', res.headers.get('age'));
  console.log('X-Vercel-Cache:', res.headers.get('x-vercel-cache'));
  console.log('X-Vercel-Id:', res.headers.get('x-vercel-id'));
  const html = await res.text();
  const scriptMatches = [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/g)].map(m => m[1]);
  console.log('Live root scripts:', scriptMatches);
}
checkDirect();
