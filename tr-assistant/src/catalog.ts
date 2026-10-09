import {classify} from '../../app/scope.js';
export {classify};
export type Document = { n?: string; t?: string; u: string; p?: string };
export type Item = { n?: number; d: string; q?: number; u?: string; vu?: number; vt?: number };
export type Opportunity = { id: string; obj: string; org?: string; un?: string; cid?: string; uf?: string; esf?: string; cl?: string; mc?: string[]; sv?: string[]; fim?: string; ini?: string; val?: number; link?: string; orig?: string; tit?: string; st?: string; docs?: Document[]; it?: Item[]; nit?: number; det?: boolean; info?: string; nota?: string; dup?: string; checkedAt?: string; source?: string; kind?: string };
export const STAGES = ['nova', 'documentacao', 'compativel', 'cotacao', 'disputada', 'declinada', 'perdida', 'ganha'] as const;
export const UFS = ['SP','MG','PR','SC','RS','RJ','DF','BA','CE','PE','GO','ES','MT','MS','PA','AM','MA','PB','RN','AL','SE','PI','TO','RO','AC','AP','RR'];
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
