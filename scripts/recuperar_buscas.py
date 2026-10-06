from coletar import *
from buscar import SEARCH_TERMS

def query(term, kind):
    # Alternate canonical parameter ordering; keep a complete pagination audit.
    params={'q':term.lower(),'tipos_documento':kind}
    if kind=='edital':params['status']='recebendo_proposta'
    params.update({'ordenacao':'-data','pagina':1,'tam_pagina':50})
    out=[];errors=[];total=None
    def getpage(p):
        params['pagina']=p
        return fetch('https://pncp.gov.br/api/search/?'+urllib.parse.urlencode(params),retries=1)
    try:
        first=getpage(1);total=first.get('total',0);out.extend(first.get('items',[]))
        for p in range(2, math.ceil(total/50)+1):
            try:out.extend(getpage(p).get('items',[]))
            except Exception as e:errors.append({'pagina':p,'erro':str(e)})
    except Exception as e:errors.append({'pagina':1,'erro':str(e)})
    for r in out:r['_termos_busca']=[term]
    print('RECUPERACAO',kind,term,total,len(out),'FALHAS',len(errors),flush=True)
    return out,{'tipo':kind,'termo':term,'totalDeclarado':total,'coletados':len(out),'falhas':errors}

def main():
    stats=json.loads((DATA/'busca_resumo.json').read_text())
    targets={(s['termo'],s['tipo']) for s in stats if 'erro' in s}
    targets |= {(s,k) for s in ['software','licença','ChatGPT','Adobe','Microsoft','Autodesk','AutoCAD','antivírus','CapCut','StreamYard','inteligência artificial','assinatura de sistema','cessão de uso','locação de sistema'] for k in ['edital','ata']}
    rows=[];audit=[]
    if (DATA/'busca_recuperada.json').exists():rows=json.loads((DATA/'busca_recuperada.json').read_text())
    with cf.ThreadPoolExecutor(max_workers=3) as pool:
        for result,st in pool.map(lambda t:query(*t),sorted(targets)):
            rows.extend(result);audit.append(st)
            (DATA/'busca_recuperada.json').write_text(json.dumps(rows,ensure_ascii=False))
            (DATA/'recuperacao_resumo.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
    (DATA/'fontes_recuperacao.json').write_text(json.dumps(LOG,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
