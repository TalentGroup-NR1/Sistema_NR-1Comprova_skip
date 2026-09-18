async function main() {
  try {
    const url = 'https://www.nr-1pronto.com.br/?nocache=' + Date.now();
    const res = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    console.log('Status:', res.status);
    console.log('URL requested:', url);
    console.log('Relevant Headers:');
    for (const [k, v] of res.headers.entries()) {
      if (k.includes('cf-') || k.includes('server') || k.includes('vercel') || k.includes('cache') || k.includes('age')) {
        console.log(`  ${k}: ${v}`);
      }
    }
    const html = await res.text();
    const scriptMatches = [...html.matchAll(/<script[^>]*src=["']([^"']+)["']/g)].map(m => m[1]);
    const cssMatches = [...html.matchAll(/<link[^>]*href=["']([^"']+)["']/g)].map(m => m[1]);
    console.log('Scripts in live HTML:');
    scriptMatches.forEach(s => console.log('  ' + s));
    console.log('CSS in live HTML:');
    cssMatches.forEach(c => console.log('  ' + c));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
main();
