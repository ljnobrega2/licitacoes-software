from triagem import *

def enrich(r):
    cnpj=r['orgao_cnpj'];year=r['ano'];seq=r['numero_sequencial']
    root='https://pncp.gov.br/api/pncp/v1/orgaos/'+cnpj+'/compras/'+year+'/'+str(seq)
    path=DATA/'detalhes'/(cnpj+'_'+year+'_'+str(seq)+'.json')
    out=json.loads(path.read_text()) if path.exists() else {'id':r['numero_controle_pncp'],'consultadoEm':dt.datetime.now().astimezone().isoformat(),'falhas':[]}
    compra='https://pncp.gov.br/api/consulta/v1/orgaos/'+cnpj+'/compras/'+year+'/'+str(seq)
    for name,url in [('compra',compra),('itens',root+'/itens?pagina=1&tamanhoPagina=500'),('arquivos',root+'/arquivos')]:
        if name in out:continue
        try:out[name]=fetch(url,retries=1)
        except Exception as e:out['falhas'].append({'campo':name,'erro':str(e)})
    out['falhas']=[f for f in out['falhas'] if f['campo'] not in out]
    path.write_text(json.dumps(out,ensure_ascii=False,indent=2))
    return out

def main():
    (DATA/'detalhes').mkdir(exist_ok=True)
    rows=load_rows()
    selected=[]
    for r in rows:
        cl,brands=classify(r)
        if r['document_type']=='edital' and status(r) in ['Prazo aberto no cadastro PNCP','Recebimento futuro anunciado'] and cl in ['Licenças comerciais identificadas','Software sem marca / validar fornecimento']:
            selected.append(r)
    selected.sort(key=lambda r:(0 if any(t in norm(r['description']) for t in ['chatgpt','claude','adobe','canva','corel']) else 1,r.get('data_fim_vigencia','')))
    print('ENRIQUECER',len(selected),flush=True)
    with cf.ThreadPoolExecutor(max_workers=4) as pool:
        for i,out in enumerate(pool.map(enrich,selected),1):
            if i%20==0:print('DETALHES',i,'DE',len(selected),flush=True)
    (DATA/'fontes_detalhes.json').write_text(json.dumps(LOG,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
