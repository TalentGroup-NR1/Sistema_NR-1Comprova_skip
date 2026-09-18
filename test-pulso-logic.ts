import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const campaigns = [
    { name: 'Pulso da Semana 38', id: '99ce99b7-9440-411a-90ae-b05443befe90', company_id: 'b496582a-fe27-4131-a6fc-bc540f470100' },
    { name: 'Pulso - sexta - 18/09/2026', id: 'c6a1c511-3dd8-4188-b634-11aee8f17815', company_id: '8ce4c4cd-0d6f-48c3-a938-6570b5bc41b4' }
  ];

  for (const c of campaigns) {
    console.log(`\n=== LOG REAL NO PULSO: ${c.name} ===`);
    const { data: rpcOut } = await supabase.rpc('get_active_pulse_campaign', { p_company_id: c.company_id });
    
    if (!rpcOut || rpcOut.length === 0) {
      console.log('Campaign expired or not active in RPC, fetching from pulse_questions directly for simulation...');
      const { data: qs } = await supabase.from('pulse_questions').select('*').eq('campaign_id', c.id).order('ordem');
      
      const questions = qs || [];
      const currentStep = 0;
      const currentQuestion = questions[currentStep];
      
      // Simulate onClick
      const responses = { [currentQuestion.id]: "0" };
      
      console.log('(a) Objeto questions completo:', JSON.stringify(questions, null, 2));
      console.log('(b) Objeto responses completo:', JSON.stringify(responses, null, 2));
      
      // Simulate isNegativeScore
      const isNegativeScore = questions.some((q) => {
        console.log(`(c) Iteração: currentQuestion.id = ${currentQuestion.id}, q.id = ${q.id}`);
        if (q.tipo !== 'escala_0_5') return false;
        const raw = responses[q.id];
        console.log(`(c) responses[q.id] =`, raw);
        if (raw === undefined || raw === "") return false;
        return Number(raw) <= 2;
      });
      console.log('isNegativeScore =', isNegativeScore);
    } else {
      const activeCampaign = rpcOut.find((x: any) => x.campaign_id === c.id);
      if (!activeCampaign) continue;
      
      const questions = activeCampaign.questions || [];
      const currentStep = 0;
      const currentQuestion = questions[currentStep];
      
      // Simulate onClick
      const responses = { [currentQuestion.id]: "0" };
      
      console.log('(a) Objeto questions completo:', JSON.stringify(questions, null, 2));
      console.log('(b) Objeto responses completo:', JSON.stringify(responses, null, 2));
      
      // Simulate isNegativeScore
      const isNegativeScore = questions.some((q: any) => {
        console.log(`(c) Iteração: currentQuestion.id = ${currentQuestion.id}, q.id = ${q.id}`);
        if (q.tipo !== 'escala_0_5') return false;
        const raw = responses[q.id];
        console.log(`(c) responses[q.id] =`, raw);
        if (raw === undefined || raw === "") return false;
        return Number(raw) <= 2;
      });
      console.log('isNegativeScore =', isNegativeScore);
    }
  }
}
run();
