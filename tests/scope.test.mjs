import test from 'node:test';import assert from 'node:assert/strict';
import {classify,classifyOpportunity} from '../app/scope.js';
test('Revit is a whole word: revitalização and cleaning products are not Autodesk',()=>{
  for(const text of ['Limpa Pedras Desincrustante ácido. Uso: revitalização de pisos.','Obra de revitalização da praça','Contratação de pedreiro para revitalização de edifício','Licença ambiental para obras','Automação industrial de bombas de irrigação','Aquisição de licenças para táxis']){assert.equal(classify(text).level,'out',text);assert.deepEqual(classify(text).mc,[]);}
  assert.equal(classify('Licenciamento Autodesk Revit por 12 meses').level,'in');
});
test('all twelve agreed AD PRO service groups are supported',()=>{
  for(const text of ['implantação de CRM','plataforma de inteligência artificial','integração de sistemas com n8n','atendimento WhatsApp Business','dashboards Power BI','desenvolvimento de software sob medida','marketing digital e tráfego pago','criação de landing pages','copywriting comercial','ERP e gateway de pagamento','plataforma para recrutamento automatizado','treinamento comercial e suporte de software'])assert.equal(classify(text).level,'in',text);
});
test('generic physical services do not become digital work',()=>{
  for(const text of ['suporte técnico a aparelho de ar condicionado','recrutamento de médicos','produção de conteúdo para festa presencial','instalação de sistema de alarme de incêndio'])assert.equal(classify(text).level,'out',text);
  assert.equal(classify('Aquisição de notebooks com Microsoft Windows').level,'review');
});
test('item evidence is used, but old incorrect badges are never used as evidence',()=>{
  assert.equal(classifyOpportunity({obj:'Produtos de limpeza',mc:['Autodesk']}).level,'out');
  assert.equal(classifyOpportunity({obj:'Assinaturas para órgão público',it:[{d:'ChatGPT Business 12 meses'}]}).level,'in');
});
test('a headset mentioning VoIP is hardware, not an AD PRO communications service',()=>{assert.equal(classify('fone de ouvido com microfone para computador aplicação VOIP tipo headset extra auricular').level,'out');assert.equal(classify('Aquisição de headset e licença de software VoIP em nuvem').level,'review');});
