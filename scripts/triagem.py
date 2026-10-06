from coletar import *
import re
from zoneinfo import ZoneInfo
NOW=dt.datetime.now(ZoneInfo('America/Sao_Paulo')).replace(tzinfo=None)
BRANDS={
'ChatGPT/OpenAI':r'chat\s?gpt|openai', 'Claude/Anthropic':r'\bclaude\b|anthropic',
'Adobe':r'\badobe\b|\bacrobat\b|creative cloud|photoshop|illustrator|indesign|premiere',
'Canva':r'\bcanva\b','CapCut':r'\bcapcut\b','CorelDRAW':r'\bcorel\w*',
'Microsoft':r'\bmicrosoft\b|\boffice\s?365\b|\bm365\b|\bwindows\b|\bpower\s?bi\b|\bazure\b|\bcopilot\b|\bsql server\b',
'Google Workspace/Gemini':r'google workspace|g suite|\bgemini\b|google for education',
'Autodesk/AutoCAD/Revit':r'\bautodesk\b|\bautocad\b|\brevit\b|aec collection',
'SketchUp':r'\bsketchup\b','ArcGIS/Esri':r'\barcgis\b|\besri\b',
'Segurança/antivírus':r'antivirus|antimalware|\bkaspersky\b|\beset\b|bitdefender|\bsophos\b|\bfortinet\b|trend micro|crowdstrike|sentinelone|\bwithsecure\b|\bfirewall\b|\bendpoint\b',
'Veeam/backup':r'\bveeam\b|\bacronis\b|\bcommvault\b',
'VMware/virtualização':r'\bvmware\b|\bvsphere\b|\bproxmox\b|\bnutanix\b',
'Red Hat':r'\bred hat\b|\bredhat\b|\bopenshift\b', 'Oracle':r'\boracle\b',
'Qlik/Tableau':r'\bqlik\b|\btableau\b', 'Zoom/videoconferência':r'\bzoom\b(?=.{0,40}(?:licenc|meeting|assinatura))|\bzoom meetings\b|\bwebex\b|\bstreamyard\b',
'Acesso remoto':r'\bteamviewer\b|\banydesk\b', 'Bancos de imagens':r'\bshutterstock\b|\bfreepik\b|\benvato\b',
'IA generativa (outras)':r'\bperplexity\b|\bdeepseek\b|\bnotebooklm\b|\blovable\b|\bmanus ai\b|ia generativa|inteligencia artificial generativa',
'Engenharia/CAD (outros)':r'\bsolidworks\b|\bmatlab\b|\blumion\b|\benscape\b|\beberick\b|\baltoqi\b|\bbentley\b|\btrimble\b|\borcafascio\b|\bpix4d\b|\bagisoft\b|global mapper|\bv-ray\b|\bzwcad\b|\bbricscad\b|\bgstarcad\b',
'Pesquisa/estatística':r'\bspss\b|\bstata\b|\bnvivo\b|atlas\.ti|\bendnote\b|\bturnitin\b|\bminitab\b',
'Segurança (outras marcas)':r'\bmcafee\b|\bmalwarebytes\b|\bwatchguard\b|check ?point|palo alto networks|\bsonicwall\b|\btrellix\b',
'Colaboração/marketing SaaS':r'\bdropbox\b|\bslack\b|\bzendesk\b|\bsalesforce\b|\bhubspot\b|rd station|\bsemrush\b|\bmlabs\b|\bvimeo\b|\bkahoot\b|\bmentimeter\b|\bpadlet\b|\bwinrar\b|\bcitrix\b|\b1password\b|\blastpass\b|\bclickup\b|\basana\b|\bpipefy\b',
'Outros SaaS':r'\bfigma\b|\bnotion\b|\bdocusign\b|\bclicksign\b|\bperplexity\b|\bmidjourney\b|\bfoxit\b|nitro pdf|\bgrammarly\b|\btrello\b|\batlassian\b|\bjira\b|\bjetbrains\b|\bgithub\b|\bgitlab\b'
}
SOFT=r'software|softwares|softwere|softwar|licenciamento de sistema|licenca.{0,40}(?:sistema|plataforma|programa|uso)|subscri|\bsaas\b|sistema.{0,25}informatizad|locacao.{0,30}sistema|cessao.{0,30}sistema|plataforma.{0,40}inteligencia artificial|programas? de computador|solucao informatizada'
HARD=r'aquisicao.{0,90}(?:equipamento|computador|notebook|workstation)|fornecimento.{0,50}(?:equipamento|hardware)|outsourcing de impressao|locacao de equipamentos|cameras|videomonitoramento|catraca|impressoras|appliances|ponto eletronico|suporte tecnico avancado'
COMPLEX=r'desenvolvimento|fabrica de software|gestao publica|gestao municipal|gestao hospitalar|prontuario|contabilidade|folha de pagamento|tributari|recursos humanos|gestao educacional|gestao escolar|gestao de saude|ponto eletronico|gestao de cemiterio|georreferenci|sistema integrado|solucao integrada|portal institucional'

ESFERAS={'F':'Federal','E':'Estadual','M':'Municipal','D':'Distrital','N':'Não se aplica'}

def from_consulta(d):
    """Converte um registro da API de consulta (camelCase) para o formato da busca usado na triagem."""
    org=d.get('orgaoEntidade') or {};un=d.get('unidadeOrgao') or {}
    cnpj=org.get('cnpj');ano=str(d.get('anoCompra'));seq=str(d.get('sequencialCompra'))
    return {
        'numero_controle_pncp':d['numeroControlePNCP'],'document_type':'edital','description':d.get('objetoCompra') or '',
        'informacao_complementar':d.get('informacaoComplementar'),
        'title':(d.get('tipoInstrumentoConvocatorioNome') or 'Contratação')+' nº '+str(d.get('numeroCompra'))+'/'+ano,
        'item_url':'/compras/'+str(cnpj)+'/'+ano+'/'+seq,'ano':ano,'numero_sequencial':seq,
        'orgao_cnpj':cnpj,'orgao_nome':org.get('razaoSocial'),'unidade_nome':un.get('nomeUnidade'),'unidade_codigo':un.get('codigoUnidade'),
        'esfera_id':org.get('esferaId'),'esfera_nome':ESFERAS.get(org.get('esferaId'),org.get('esferaId')),'poder_id':org.get('poderId'),
        'municipio_nome':un.get('municipioNome'),'codigo_ibge':un.get('codigoIbge'),'uf':un.get('ufSigla'),
        'modalidade_licitacao_id':str(d.get('modalidadeId')),'modalidade_licitacao_nome':d.get('modalidadeNome'),
        'situacao_id':str(d.get('situacaoCompraId')),'situacao_nome':d.get('situacaoCompraNome'),'cancelado':False,
        'data_publicacao_pncp':d.get('dataPublicacaoPncp') or '','data_atualizacao_pncp':d.get('dataAtualizacaoGlobal') or d.get('dataAtualizacao') or '',
        'data_inicio_vigencia':d.get('dataAberturaProposta'),'data_fim_vigencia':d.get('dataEncerramentoProposta'),
        'valor_total_estimado':d.get('valorTotalEstimado'),'srp':d.get('srp'),
        'link_sistema_origem':d.get('linkSistemaOrigem'),'link_processo_eletronico':d.get('linkProcessoEletronico'),
        'tipo_nome':d.get('tipoInstrumentoConvocatorioNome'),'_termos_busca':[],'_fonte':'API de propostas abertas (varredura por UF)'}

# Campos que mudam com retificação: vale a versão com atualização mais recente, não a ordem dos arquivos.
VOLATEIS=['data_inicio_vigencia','data_fim_vigencia','situacao_id','situacao_nome','valor_total_estimado','data_atualizacao_pncp','link_sistema_origem']

def merge(rows,r):
    key=r['numero_controle_pncp']
    if key not in rows:rows[key]=r.copy();return
    old=rows[key];terms=sorted(set(old.get('_termos_busca',[])+r.get('_termos_busca',[])))
    newer=(r.get('data_atualizacao_pncp') or '')[:19]>=(old.get('data_atualizacao_pncp') or '')[:19]
    if r.get('_fonte') and not old.get('_fonte'):
        # Registro da busca é mais rico; a consulta só acrescenta campos ausentes e atualiza os voláteis.
        for k,v in r.items():
            if k.startswith('_'):continue
            if old.get(k) in (None,'') or (newer and k in VOLATEIS and v not in (None,'')):old[k]=v
        old['_fonte_extra']=r['_fonte']
    elif old.get('_fonte') and not r.get('_fonte'):
        base=r.copy()
        for k,v in old.items():
            if k.startswith('_'):continue
            if base.get(k) in (None,'') or (not newer and k in VOLATEIS and v not in (None,'')):base[k]=v
        base['_fonte_extra']=old['_fonte'];rows[key]=old=base
    elif newer:old.update(r)
    else:
        for k,v in r.items():old.setdefault(k,v)
    old['_termos_busca']=terms

BUSCAS=['busca_resultados.json','busca_recuperada.json','busca_lacunas.json']
CONSULTAS=['propostas_parcial.json','propostas_uf_candidatas.json']

def load_rows():
    rows={}
    for path in sorted(DATA.glob('*.json')):
        if path.name.startswith(('fontes','propostas')):continue
        try:d=json.loads(path.read_text())
        except Exception:continue
        rr=d.get('items',[]) if isinstance(d,dict) else d if path.name in BUSCAS else []
        for r in rr:
            if not isinstance(r,dict) or not r.get('numero_controle_pncp'):continue
            merge(rows,r)
    for name in CONSULTAS:
        path=DATA/name
        if not path.exists():continue
        for d in json.loads(path.read_text()):
            if not d.get('numeroControlePNCP'):continue
            if name=='propostas_parcial.json' and not relevant(d):continue
            merge(rows,from_consulta(d))
    return list(rows.values())

def classify(r,extra=''):
    s=norm((r.get('description') or '')+' '+extra)
    brands=[k for k,p in BRANDS.items() if re.search(p,s)]
    has_software=bool(brands or re.search(SOFT,s))
    if not has_software:return 'Fora do foco / conferir itens',brands
    if re.search(r'inscricao|participacao.{0,30}curso|capacitacao denominada',s) and not re.search(r'fornecimento.{0,50}licenc',s):return 'Curso / fora do foco',brands
    if re.search(HARD,s):return 'Hardware ou solução integrada',brands
    if brands:return 'Licenças comerciais identificadas',brands
    if re.search(COMPLEX,s):return 'Sistema especializado / serviços',brands
    return 'Software sem marca / validar fornecimento',brands

def status(r):
    def date(s):
        try:return dt.datetime.fromisoformat(s)
        except:return None
    end=date(r.get('data_fim_vigencia') or '')
    start=date(r.get('data_inicio_vigencia') or '')
    if r.get('cancelado') or str(r.get('situacao_id')) in ['2','3','4']:return 'Suspensa/cancelada — conferir'
    if r['document_type']=='ata':
        if end and end<NOW.replace(hour=0,minute=0,second=0,microsecond=0):return 'Ata vencida'
        if start and start>NOW:return 'Ata com vigência futura'
        if end:return 'Ata vigente — fornecedor já selecionado'
        return 'Ata sem vigência confirmada'
    if end and end<=NOW:return 'Prazo encerrado'
    if not end:return 'Prazo não confirmado'
    if end.year>NOW.year+1:return 'Data distante/inconsistente — conferir'
    if r.get('data_publicacao_pncp','')[:4]<'2026':return 'Registro antigo com prazo futuro — conferir'
    if start and start>NOW:return 'Recebimento futuro anunciado'
    return 'Prazo aberto no cadastro PNCP'

def main():
    rows=load_rows()
    for r in rows:r['_classe'],r['_marcas']=classify(r);r['_status']=status(r)
    (DATA/'triagem.json').write_text(json.dumps(rows,ensure_ascii=False))
    from collections import Counter
    print('TOTAL',len(rows));print(Counter(r['_classe'] for r in rows if r['document_type']=='edital'));print(Counter(r['_status'] for r in rows))

if __name__=='__main__':main()
