"""Varredura sistemática da API de propostas abertas do PNCP, particionada por UF.

Retomável: páginas já baixadas ficam em dados/cache_propostas_uf e não são pedidas de novo.
Saídas: dados/propostas_uf_candidatas.json (filtradas por objeto) e dados/coleta_uf_resumo.json.
"""
import re
import sys
from coletar import *

UFS=['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']
CACHE=DATA/'cache_propostas_uf'
BASE='https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?dataFinal=20991231&tamanhoPagina=50'
EXTRA=['inteligencia artificial','cessao de uso','direito de uso','locacao de sistema','capcut','streamyard','workspace','firewall','certificado digital','assinatura digital','assinatura eletronica','banco de dados','virtualizacao','videoconferencia','solidworks','matlab','bentley','trimble','lumion','enscape','v-ray','sketch','coreldraw','winrar','project','visio','sql server','exchange','sharepoint','teams','dynamics','endpoint','edr','xdr','siem','e-mail','email','dominio','hospedagem','data center','datacenter','ia generativa','llm','api','copilot','deepseek','manus','lovable','cursor','n8n','zapier','hubspot','salesforce','rd station','pipedrive','zendesk','slack','miro','asana','monday','clickup','dropbox','onedrive','icloud','1password','lastpass','bitwarden','nord','vpn','starlink']

def wide(d):
    s=norm((d.get('objetoCompra') or '')+' '+(d.get('informacaoComplementar') or ''))
    return any(t in s for t in TERMS) or any(re.search(r'\b'+re.escape(t)+r'\b',s) for t in EXTRA)

def crawl(uf):
    url=BASE+'&uf='+uf+'&pagina='
    rows=[];failed=[]
    try:first=fetch(url+'1',cache=CACHE)
    except Exception as e:return rows,{'uf':uf,'totalDeclarado':None,'paginas':None,'coletados':0,'falhas':[{'pagina':1,'erro':str(e)[-200:]}]}
    pages=first.get('totalPaginas',0);rows.extend(first.get('data',[]))
    with cf.ThreadPoolExecutor(max_workers=4) as pool:
        jobs={pool.submit(fetch,url+str(p),3,CACHE):p for p in range(2,pages+1)}
        for i,f in enumerate(cf.as_completed(jobs),1):
            try:rows.extend(f.result().get('data',[]))
            except Exception as e:failed.append({'pagina':jobs[f],'erro':str(e)[-200:]})
            if i%20==0:print(uf,'paginas',i,'de',pages,'registros',len(rows),'falhas',len(failed),flush=True)
    return rows,{'uf':uf,'totalDeclarado':first.get('totalRegistros'),'paginas':pages,'coletados':len(rows),'falhas':failed}

def main():
    ufs=sys.argv[1:] or UFS
    unique={};audit=[]
    for uf in ufs:
        rows,st=crawl(uf)
        for r in rows:unique[r['numeroControlePNCP']]=r
        st['unicosAcumulados']=len(unique);audit.append(st)
        print('UF',uf,st['totalDeclarado'],st['coletados'],'FALHAS',len(st['falhas']),flush=True)
        sel=[r for r in unique.values() if wide(r)]
        (DATA/'propostas_uf_candidatas.json').write_text(json.dumps(sel,ensure_ascii=False))
        (DATA/'coleta_uf_resumo.json').write_text(json.dumps({'consultadoEm':dt.datetime.now().astimezone().isoformat(),'unicos':len(unique),'candidatasObjeto':len(sel),'ufs':audit},ensure_ascii=False,indent=2))
        (DATA/'fontes_propostas_uf.json').write_text(json.dumps(LOG,ensure_ascii=False,indent=2))
    print('CONCLUIDO',len(unique),flush=True)

if __name__=='__main__':main()
