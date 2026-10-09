const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const brands={
  'Microsoft':/\bmicrosoft\b|\boffice\s?365\b|\bm365\b|\bwindows\b|\bpower bi\b|\bcopilot\b|\bsql server\b|\bazure\b/,
  'Adobe':/\badobe\b|\bacrobat\b|\bphotoshop\b|\bcreative cloud\b|\billustrator\b|\bindesign\b/,
  'ChatGPT/OpenAI':/\bchat\s?gpt\b|\bopenai\b/,'Claude/Anthropic':/\bclaude\b|\banthropic\b/,
  'Canva':/\bcanva\b/,'CapCut':/\bcapcut\b/,'Autodesk':/\bautodesk\b|\bautocad\b|\brevit\b|\baec collection\b/,
  'Google':/\bgoogle workspace\b|\bg suite\b|\bgoogle for education\b|\bgoogle gemini\b/,
  'Segurança/antivírus':/\bantivirus\b|\bkaspersky\b|\beset\b|\bbitdefender\b|\bsophos\b|\bfortinet\b|\bfirewall\b/,
  'CorelDRAW':/\bcorel(?:draw)?\b/,'Backup':/\bveeam\b|\bacronis\b|\bcommvault\b/,
  'CAD e engenharia':/\bsketchup\b|\barcgis\b|\besri\b|\bsolidworks\b|\bmatlab\b|\blumion\b|\baltoqi\b|\bzwcad\b|\beberick\b|\benscape\b|\bbricscad\b|\bpix4d\b|\borcafascio\b/,
  'VMware e virtualização':/\bvmware\b|\bvsphere\b|\bproxmox\b|\bnutanix\b/,'Red Hat':/\bred hat\b|\bredhat\b|\bopenshift\b/,'Oracle':/\boracle\b/,
  'BI e pesquisa':/\bqlik\b|\btableau\b|\bspss\b|\bstata\b|\bnvivo\b|\bturnitin\b|\bminitab\b/,
  'Videoconferência':/\bzoom meetings\b|\bwebex\b|\bstreamyard\b|\bzoom\b(?=.{0,30}(?:licenc|meeting|assinatura))/,
  'IA e SaaS':/\bperplexity\b|\bdeepseek\b|\bnotebooklm\b|\blovable\b|\bmidjourney\b|\bgrammarly\b|\bfoxit\b|\bjetbrains\b|\bcitrix\b|\bwinrar\b|\b1password\b|\blastpass\b|\bclickup\b|\basana\b|\bpipefy\b/,
  'Colaboração e SaaS':/\bsalesforce\b|\bhubspot\b|\brd station\b|\bzendesk\b|\bslack\b|\bfigma\b|\bnotion\b|\btrello\b|\bjira\b|\bdocusign\b|\bclicksign\b|\bteamviewer\b|\banydesk\b|\bdropbox\b|\bsemrush\b/
};
const services={
  'CRM e processo comercial':/\bcrm\b|funil de vendas|pipeline comercial|forca de vendas|gestao de relacionamento com (?:o )?cliente/,
  'IA e agentes inteligentes':/inteligencia artificial|ia generativa|chatbot|\b(?:agente|assistente) de ia\b|machine learning/,
  'Automação e integrações':/\bn8n\b|\brpa\b|\bwebhooks?\b|integrac(?:ao|oes) (?:de |entre )?sistemas?|automacao de (?:processos|fluxos|marketing)|\bworkflow\b/,
  'WhatsApp, atendimento e VoIP':/\bwhatsapp\b|omnichannel|\bvoip\b|telefonia (?:ip|em nuvem)|atendimento digital/,
  'Dashboards, BI e dados':/\bdashboards?\b|\bpower bi\b|business intelligence|visualizacao de dados|indicadores gerenciais|data analytics/,
  'Sistemas e desenvolvimento sob medida':/desenvolvimento.{0,30}(?:sistema|software|aplicativo|plataforma)|fabrica de software|sistema sob medida|aplicativo (?:web|mobile)/,
  'Marketing digital e tráfego pago':/marketing digital|trafego pago|midia paga|\bmeta ads\b|\bgoogle ads\b|performance digital|remarketing|agencia de marketing/,
  'Landing pages, sites e conversão':/landing pages?|pagina de aterrissagem|(?:criacao|desenvolvimento).{0,20}(?:site|hotsite|portal web)|portal institucional/,
  'Copywriting e conteúdo comercial':/copywriting|redacao publicitaria|conteudo (?:comercial|para redes sociais|digital)|roteiro comercial/,
  'ERP, pagamentos e e-commerce':/\berp\b|sistema de gestao empresarial|gateway de pagamento|cobranca recorrente|e-commerce|loja virtual/,
  'Recrutamento e RH automatizado':/(?:recrutamento|triagem de curriculos|selecao de candidatos).{0,35}(?:automat|software|plataforma|digital)|(?:software|plataforma).{0,35}(?:recrutamento|banco de talentos)|\bats\b/,
  'Treinamento, suporte e sustentação':/(?:treinamento|capacitacao|suporte|sustentacao).{0,40}(?:software|sistemas? (?:informat|de gestao)|\bcrm\b|usuarios|microsoft|tecnica de vendas)|treinamento comercial/
};
const software=/\bsoftwares?\b|\bsaas\b|programas? de computador|solucao informatizada|sistema.{0,30}informatizad|(?:licenc|subscri|assinatura|locacao|cessao).{0,45}(?:software|sistema (?:de gestao|informatizado)|plataforma digital)|sistema (?:de gestao|tributario|contabil|de folha|de prontuario)/;
const physical=/aquisicao.{0,55}(?:computadores|notebooks|workstations|impressoras)|(?:execucao|contratacao).{0,35}(?:obra|engenharia civil)|materiais? (?:de limpeza|de construcao)|videomonitoramento|cameras de seguranca|sistema de (?:alarme|deteccao de incendio|irrigacao)|automacao (?:industrial|predial)/;
export function classify(text){
  const s=normalize(text),mc=Object.entries(brands).filter(([,re])=>re.test(s)).map(([name])=>name),sv=Object.entries(services).filter(([,re])=>re.test(s)).map(([name])=>name);
  const hardware=/\bheadsets?\b|fones? de ouvido|\b(?:notebooks?|impressoras?|roteadores?|switches|workstations?)\b/.test(s),onlyHardware=hardware&&!software.test(s)&&!mc.length&&sv.every(name=>name==='WhatsApp, atendimento e VoIP')&&!/servico de|plataforma|em nuvem|assinatura|desenvolvimento/.test(s);
  const signal=!onlyHardware&&!!(mc.length||sv.length||software.test(s)),mixed=signal&&(physical.test(s)||hardware),level=!signal?'out':mixed?'review':'in';
  return {relevant:signal,mc:signal?mc:[],sv:signal?sv:[],cl:!signal?'Fora do escopo AD PRO':mixed?'Solução integrada — revisar':mc.length?'Licença comercial':sv.length?'Solução com serviços':'Software sem marca',level,reason:onlyHardware?'Equipamento físico: a menção a VoIP não caracteriza serviço digital da AD PRO.':!signal?'Nenhuma evidência de software ou serviço digital da AD PRO no objeto e itens.':mixed?'Inclui hardware, obra ou automação física: validar a parte digital antes de considerar compatível.':'Evidência de '+(mc[0]||sv[0]||'software')+' no objeto ou itens; edital ainda precisa ser validado.'};
}
export function classifyOpportunity(record){return classify([record.obj,record.info,...(record.it||[]).map(item=>item.d)].join(' '));}
