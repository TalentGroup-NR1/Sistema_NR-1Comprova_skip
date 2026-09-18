async function inspectLiveJs() {
  try {
    const url = 'https://www.nr-1pronto.com.br/assets/CJDV-rxn.js';
    const res = await fetch(url);
    console.log('Status:', res.status);
    console.log('Content-Length:', res.headers.get('content-length'));
    const text = await res.text();
    console.log('Contains faleConoscoNovos:', text.includes('faleConoscoNovos'));
    console.log('Contains denunciasNovas:', text.includes('denunciasNovas'));
    console.log('Contains /comportamentos-ofensivos:', text.includes('/comportamentos-ofensivos'));
    console.log('Contains /denuncias:', text.includes('/denuncias'));
    
    // Look for occurrences of "/comportamentos-ofensivos" and nearby code
    let idx = text.indexOf('/comportamentos-ofensivos');
    while (idx !== -1) {
      console.log('\nMatch snippet:');
      console.log(text.slice(Math.max(0, idx - 100), Math.min(text.length, idx + 200)));
      idx = text.indexOf('/comportamentos-ofensivos', idx + 1);
    }
  } catch (err) {
    console.error('Error inspecting live JS:', err);
  }
}
inspectLiveJs();
