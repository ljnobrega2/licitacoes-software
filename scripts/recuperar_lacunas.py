"""Refaz, com fetch resistente, toda busca por termo que falhou ou ficou incompleta.

Lê busca_resumo.json e recuperacao_resumo.json, repete os termos com lacuna e acrescenta termos novos.
Saídas: dados/busca_lacunas.json (formato da busca) e dados/lacunas_resumo.json.
"""
from coletar import *
from buscar import SEARCH_TERMS

NOVOS=['CapCut','StreamYard','inteligência artificial','assinatura de sistema','cessão de uso','locação de sistema','locação de software','licença de uso','direito de uso de software','Copilot','Microsoft 365','Creative Cloud','Photoshop','Canva Pro','IA generativa','Claude Team','DeepSeek','Manus','Lovable','NotebookLM','firewall','endpoint','certificado digital','assinatura eletrônica','videoconferência','SolidWorks','MATLAB','Lumion','Enscape','SQL Server','Windows Server','WinRAR','Project','Visio','Dropbox','Slack','Miro','Zendesk','Salesforce','HubSpot','CrowdStrike','Trend Micro','McAfee','Acronis','Citrix','Nutanix','Zabbix','Elastic','Datadog','SPSS','Stata','NVivo','Atlas.ti','EndNote','Turnitin','Minitab','Wolfram','Bentley','Trimble','QGIS','Global Mapper','Agisoft','Pix4D','TQS','Eberick','AltoQi','Orçafascio','Volare','Zoom Workplace','Webex','Kahoot','Mentimeter','Padlet','LinkedIn Learning','Alura','Vimeo','Wix','Hotmart','Elementor','Semrush','mLabs','RD Station','Pipefy','Monday','ClickUp','Asana','1Password','LastPass','NordVPN','Malwarebytes','Avast','Norton','Panda','WatchGuard','Check Point','Palo Alto','SonicWall','pfSense','Veritas','Commvault','Zerto','SUSE','Ubuntu Pro','Docker','Postman','Unity','Unreal','Cursor','Copilot Studio','Power Automate','Power Apps','Dynamics','Azure','AWS','Google Cloud','Oracle Cloud']

def gaps():
    seen={}
    for name in ['busca_resumo.json','recuperacao_resumo.json']:
        for s in json.loads((DATA/name).read_text()):
            k=(s['termo'],s['tipo']);tot=s.get('totalDeclarado');col=s.get('coletados') or 0
            ok='erro' not in s and not s.get('falhas') and tot is not None and col>=tot
            seen[k]=seen.get(k,False) or ok
    for t in SEARCH_TERMS:
        for k in ['edital','ata']:seen.setdefault((t,k),False)
    out=[k for k,ok in seen.items() if not ok]
    out+=[(t,k) for t in NOVOS for k in ['edital','ata'] if (t,k) not in seen]
    return sorted(set(out),key=lambda x:(x[1]!='edital',x[0]))

def query(term,kind):
    params={'q':term,'tipos_documento':kind,'ordenacao':'-data','pagina':1,'tam_pagina':100}
    if kind=='edital':params['status']='recebendo_proposta'
    out=[];errors=[];total=None
    def page(p):
        params['pagina']=p
        return fetch('https://pncp.gov.br/api/search/?'+urllib.parse.urlencode(params))
    try:
        first=page(1);total=first.get('total',0);out.extend(first.get('items',[]))
        for p in range(2,min(math.ceil(total/100),100)+1):
            try:out.extend(page(p).get('items',[]))
            except Exception as e:errors.append({'pagina':p,'erro':str(e)[-200:]})
    except Exception as e:errors.append({'pagina':1,'erro':str(e)[-200:]})
    for r in out:r['_termos_busca']=[term]
    print('LACUNA',kind,term,total,len(out),'FALHAS',len(errors),flush=True)
    return out,{'tipo':kind,'termo':term,'totalDeclarado':total,'coletados':len(out),'falhas':errors}

def main():
    rows={};audit=[]
    for term,kind in gaps():
        result,st=query(term,kind);audit.append(st)
        for r in result:
            key=r['numero_controle_pncp']
            if key in rows:rows[key]['_termos_busca']=sorted(set(rows[key]['_termos_busca']+r['_termos_busca']))
            else:rows[key]=r
        (DATA/'busca_lacunas.json').write_text(json.dumps(list(rows.values()),ensure_ascii=False))
        (DATA/'lacunas_resumo.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2))
        (DATA/'fontes_lacunas.json').write_text(json.dumps(LOG,ensure_ascii=False,indent=2))
    print('LACUNAS CONCLUIDO',len(rows),flush=True)

if __name__=='__main__':main()
