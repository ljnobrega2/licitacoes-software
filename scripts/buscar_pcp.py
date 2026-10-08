"""Fonte externa: Portal de Compras Públicas (API pública de consulta de processos).

Inclui compradores que não publicam no PNCP (estatais, consórcios, Sistema S que usem o portal).
Saídas: dados/externo_pcp.json e dados/externo_pcp_resumo.json. Cache próprio em dados/cache_pcp.
"""
from coletar import *

API='https://compras.api.portaldecompraspublicas.com.br/v2/licitacao/processos?'
SITE='https://www.portaldecompraspublicas.com.br/processos'
TERMOS=['software','licença de uso','licenciamento','subscrição','assinatura','SaaS','inteligência artificial','ChatGPT','OpenAI','Claude','Gemini','Copilot','Adobe','Acrobat','Creative Cloud','Canva','CorelDRAW','CapCut','Microsoft','Office 365','Microsoft 365','Windows','Power BI','Google Workspace','Autodesk','AutoCAD','Revit','SketchUp','ArcGIS','antivírus','Kaspersky','ESET','Bitdefender','Sophos','Fortinet','firewall','Veeam','VMware','Oracle','Red Hat','Zoom','TeamViewer','AnyDesk','certificado digital','CRM','automação','integração de sistemas','WhatsApp API','VoIP','dashboard','business intelligence','desenvolvimento de software','tráfego pago','marketing digital','agência de marketing','landing page','copywriting','ERP','gateway de pagamento','recrutamento e seleção']
CACHE=DATA/'cache_pcp'

def get(url):
    path=CACHE/(hashlib.sha256(url.encode()).hexdigest()[:24]+'.json')
    if path.exists():return json.loads(path.read_text())
    for attempt in range(5):
        try:
            raw=subprocess.check_output(['curl','-fL','--max-time','40','-sS','-A','Mozilla/5.0','-H','Accept: application/json',url],stderr=subprocess.PIPE)
            obj=json.loads(raw);path.write_text(json.dumps(obj,ensure_ascii=False))
            LOG.append({'url':url,'arquivo':path.name,'consulta':dt.datetime.now().astimezone().isoformat()})
            time.sleep(0.4);return obj
        except Exception as e:
            if attempt==4:LOG.append({'url':url,'erro':str(e)[-200:]});raise
            time.sleep(3*2**attempt)

def main():
    CACHE.mkdir(exist_ok=True)
    rows={};audit=[]
    for term in TERMOS:
        got=0;total=None;err=''
        try:
            page=1
            while page:
                d=get(API+urllib.parse.urlencode({'pagina':page,'objeto':term,'codigoStatus':1}))
                total=d.get('total')
                for r in d.get('result',[]):
                    got+=1;key=r['codigoLicitacao']
                    if key in rows:rows[key]['_termos_busca'].append(term)
                    else:r['_termos_busca']=[term];r['_link']=SITE+(r.get('urlReferencia') or '');rows[key]=r
                # nextPage da API vem sempre 2; a paginação confiável é pageCount.
                page=page+1 if page<min(d.get('pageCount') or 0,300) else None
        except Exception as e:err=str(e)[-200:]
        audit.append({'termo':term,'totalDeclarado':total,'coletados':got,'erro':err})
        print('PCP',term,total,got,err,flush=True)
        (DATA/'externo_pcp.json').write_text(json.dumps(list(rows.values()),ensure_ascii=False))
        (DATA/'externo_pcp_resumo.json').write_text(json.dumps({'consultadoEm':dt.datetime.now().astimezone().isoformat(),'unicos':len(rows),'termos':audit},ensure_ascii=False,indent=2))
    (DATA/'fontes_pcp.json').write_text(json.dumps(LOG,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
