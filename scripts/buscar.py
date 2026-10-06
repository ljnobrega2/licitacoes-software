from coletar import *

SEARCH_TERMS=['software','licenciamento','licença','subscrição','SaaS','ChatGPT','Chat GPT','OpenAI','Claude','Adobe','Acrobat','CorelDRAW','Microsoft','Office 365','Windows','Google Workspace','Gemini','Canva','Autodesk','AutoCAD','SketchUp','Revit','ArcGIS','ESRI','antivírus','antimalware','Veeam','VMware','Red Hat','Oracle','Power BI','Tableau','Qlik','Zoom','TeamViewer','AnyDesk','Fortinet','Sophos','Kaspersky','ESET','Bitdefender','Figma','Notion','DocuSign','Clicksign','Freepik','Shutterstock','Envato','Perplexity','Midjourney','Nitro PDF','Foxit','Grammarly','Trello','Atlassian','Jira','JetBrains','GitHub','GitLab']

def search_job(term,kind):
    params={'q':term,'tipos_documento':kind,'ordenacao':'-data','pagina':1,'tam_pagina':100}
    if kind=='edital':params['status']='recebendo_proposta'
    url='https://pncp.gov.br/api/search/?'+urllib.parse.urlencode(params)
    results=[]
    total=None
    try:
        first=fetch(url)
        results=list(first.get('items',[]))
        total=first.get('total',0)
        for page in range(2,math.ceil(total/100)+1):
            params['pagina']=page
            d=fetch('https://pncp.gov.br/api/search/?'+urllib.parse.urlencode(params))
            results.extend(d.get('items',[]))
        for r in results:r['_termos_busca']=[term]
        print(kind,term,total,len(results),flush=True)
        return results,{'tipo':kind,'termo':term,'totalDeclarado':total,'coletados':len(results)}
    except Exception as e:
        print('ERRO',kind,term,str(e),flush=True)
        for r in results:r['_termos_busca']=[term]
        return results,{'tipo':kind,'termo':term,'totalDeclarado':total,'coletados':len(results),'erro':str(e)}

def main():
    rows={}
    stats=[]
    with cf.ThreadPoolExecutor(max_workers=3) as pool:
        jobs=[pool.submit(search_job,t,k) for k in ['edital','ata'] for t in SEARCH_TERMS]
        for f in cf.as_completed(jobs):
            result,stat=f.result();stats.append(stat)
            for r in result:
                key=r['numero_controle_pncp']
                if key in rows: rows[key]['_termos_busca']=sorted(set(rows[key]['_termos_busca']+r['_termos_busca']))
                else: rows[key]=r
            (DATA/'busca_resultados.json').write_text(json.dumps(list(rows.values()),ensure_ascii=False))
            (DATA/'busca_resumo.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2))
    (DATA/'fontes_busca.json').write_text(json.dumps(LOG,ensure_ascii=False,indent=2))
    print('BUSCA CONCLUIDA',len(rows),flush=True)

if __name__=='__main__':main()
