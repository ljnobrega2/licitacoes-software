export type Document = { n?: string; t?: string; u: string; p?: string };
export type Item = { n?: number; d: string; q?: number; u?: string; vu?: number; vt?: number };
export type Opportunity = { id: string; obj: string; org?: string; un?: string; cid?: string; uf?: string; esf?: string; cl?: string; mc?: string[]; sv?: string[]; fim?: string; ini?: string; val?: number; link?: string; orig?: string; tit?: string; st?: string; docs?: Document[]; it?: Item[]; nit?: number; det?: boolean; info?: string; nota?: string; dup?: string; checkedAt?: string; source?: string; kind?: string };
export const STAGES = ['nova', 'documentacao', 'compativel', 'cotacao', 'disputada', 'declinada', 'perdida', 'ganha'] as const;
export const UFS = ['SP','MG','PR','SC','RS','RJ','DF','BA','CE','PE','GO','ES','MT','MS','PA','AM','MA','PB','RN','AL','SE','PI','TO','RO','AC','AP','RR'];
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const brands: Record<string, RegExp> = { 'Microsoft': /microsoft|office 365|m365|windows|power bi|copilot|sql server/, 'Adobe': /adobe|acrobat|photoshop|creative cloud/, 'ChatGPT/OpenAI': /chat\s?gpt|openai/, 'Claude/Anthropic': /claude|anthropic/, 'Canva': /canva/, 'Autodesk': /autodesk|autocad|revit/, 'Google': /google workspace|gemini|g suite/, 'Segurança/antivírus': /antivirus|kaspersky|eset|bitdefender|sophos|fortinet|firewall/, 'CorelDRAW': /corel/, 'Backup': /veeam|acronis|backup/ };
const services: Record<string, RegExp> = { 'CRM e processo comercial': /\bcrm\b|funil de vendas/, 'IA e agentes inteligentes': /inteligencia artificial|ia generativa|chatbot/, 'Automação e integrações': /automacao|integracao de sistemas|\brpa\b|\bn8n\b|webhook/, 'WhatsApp, atendimento e VoIP': /whatsapp|omnichannel|\bvoip\b/, 'Dashboards, BI e dados': /dashboard|power bi|business intelligence/, 'Sistemas e desenvolvimento sob medida': /desenvolvimento.{0,30}(sistema|software|aplicativo)|fabrica de software/, 'Marketing digital e tráfego pago': /marketing digital|trafego pago|midia paga/, 'Sites e landing pages': /landing page|desenvolvimento de site|portal institucional/, 'ERP, pagamentos e e-commerce': /\berp\b|e-commerce|gateway de pagamento/, 'Treinamento, suporte e sustentação': /suporte tecnico|sustentacao|treinamento de usuario/ };
export function classify(text: string) {
  const s = norm(text), mc = Object.entries(brands).filter(([,re])=>re.test(s)).map(([name])=>name), sv = Object.entries(services).filter(([,re])=>re.test(s)).map(([name])=>name);
  const relevant = !!(mc.length || sv.length || /software|licenc|subscri|saas|sistema.{0,25}informatizad|locacao.{0,25}sistema|assinatura.{0,25}(sistema|plataforma|digital)/.test(s));
  return { relevant, mc, sv, cl: mc.length ? 'Licença comercial' : sv.length || /desenvolvimento|implantacao|gestao publica|folha de pagamento/.test(s) ? 'Solução com serviços' : 'Software sem marca' };
}
type Raw = Record<string, unknown>;
const str = (v: unknown) => typeof v === 'string' ? v : v == null ? '' : String(v);
export function fromPNCP(raw: Raw): Opportunity {
  const org = (raw.orgaoEntidade || {}) as Raw, unit = (raw.unidadeOrgao || {}) as Raw;
  const cnpj = str(org.cnpj), year = str(raw.anoCompra), seq = str(raw.sequencialCompra);
  const obj = str(raw.objetoCompra), tags = classify(obj + ' ' + str(raw.informacaoComplementar));
  return { id: str(raw.numeroControlePNCP), obj, org: str(org.razaoSocial), un: str(unit.nomeUnidade), cid: str(unit.municipioNome), uf: str(unit.ufSigla), esf: ({M:'Municipal',E:'Estadual',F:'Federal',D:'Distrital'} as Record<string,string>)[str(org.esferaId)] || '', cl: tags.cl, mc: tags.mc, sv: tags.sv, fim: str(raw.dataEncerramentoProposta), ini: str(raw.dataAberturaProposta), val: Number(raw.valorTotalEstimado)||undefined, link: `https://pncp.gov.br/app/editais/${cnpj}/${year}/${seq}`, orig: str(raw.linkSistemaOrigem), tit: str(raw.modalidadeNome)+' '+str(raw.numeroCompra)+'/'+year, st: str(raw.situacaoCompraNome), info: str(raw.informacaoComplementar), kind:'opportunity' };
}
export function deadlineISO(date?: string) { return date ? (/Z$|[+-]\d\d:\d\d$/.test(date) ? new Date(date) : new Date(date+'-03:00')).toISOString() : null; }
export function pncpRoot(id: string) {
  const match = /^(\d{14})-1-(\d+)\/(\d{4})$/.exec(id);
  if (!match) return null;
  return { cnpj:match[1], seq:Number(match[2]), year:match[3], root:`https://pncp.gov.br/api/pncp/v1/orgaos/${match[1]}/compras/${match[3]}/${Number(match[2])}` };
}
export function documents(raw: unknown): Document[] {
  return (Array.isArray(raw)?raw:[]).filter(d=>d.statusAtivo!==false&&d.url).map(d=>({n:d.titulo||'Documento',t:d.tipoDocumentoNome,u:d.url,p:d.dataPublicacaoPncp}));
}
export function items(raw: unknown): Item[] {
  const rows = Array.isArray(raw)?raw:(raw as {data?: unknown[]})?.data||[];
  return rows.map(value=>{const i=value as Raw; return {n:Number(i.numeroItem),d:str(i.descricao),q:Number(i.quantidade),u:str(i.unidadeMedida),vu:i.orcamentoSigiloso?undefined:Number(i.valorUnitarioEstimado),vt:i.orcamentoSigiloso?undefined:Number(i.valorTotal)};});
}
