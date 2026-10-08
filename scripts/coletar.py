import concurrent.futures as cf
import datetime as dt
import fcntl
import hashlib
import json
import math
import random
from pathlib import Path
import subprocess
import time
import unicodedata
import urllib.parse

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'dados'
DATA.mkdir(exist_ok=True)
LOG = []

MIN_RETRIES = 9
INTERVALO = 2.5  # medido em 06/10/2026: 1 req/3 s passa sem 429; 1 req/0,8 s é bloqueado. Vale para todos os processos somados
PACE = DATA / '.ritmo'

def pace(penalty=0):
    """Ritmo global entre processos. O PNCP responde 429 ou derruba a conexão (curl 56) quando há rajada."""
    with open(PACE, 'a+') as f:
        fcntl.flock(f, fcntl.LOCK_EX)
        f.seek(0)
        try: nxt = float(f.read().strip() or 0)
        except ValueError: nxt = 0
        now = time.time()
        if penalty:
            nxt = max(nxt, now + penalty)
        else:
            if nxt > now: time.sleep(nxt - now)
            nxt = time.time() + INTERVALO
        f.seek(0); f.truncate(); f.write(str(nxt))

def fetch(url, retries=3, cache=None, fresh=False):
    """Baixa JSON com cache por URL. Falhas são limitação de taxa: espera e insiste."""
    folder = cache or DATA
    folder.mkdir(exist_ok=True)
    path = folder / (hashlib.sha256(url.encode()).hexdigest()[:24] + '.json')
    if path.exists() and not fresh:
        return json.loads(path.read_text())
    retries = max(retries, MIN_RETRIES)
    for attempt in range(retries):
        try:
            pace()
            raw = subprocess.check_output(['curl', '-fL', '--max-time', '60', '-sS', url], stderr=subprocess.PIPE)
            # A API de consulta responde 204 sem corpo quando a página não tem registros.
            obj = json.loads(raw) if raw.strip() else {'data': [], 'items': [], 'totalRegistros': 0, 'totalPaginas': 0, 'total': 0, 'empty': True}
            if isinstance(obj, dict) and (obj.get('status') or 0) >= 400:
                raise ValueError(str(obj))
            path.write_text(json.dumps(obj, ensure_ascii=False))
            LOG.append({'url':url, 'arquivo':path.name, 'consulta':dt.datetime.now().astimezone().isoformat(), 'tentativas':attempt+1})
            return obj
        except Exception as e:
            msg = (e.stderr.decode(errors='replace') if getattr(e, 'stderr', None) else str(e))[-300:]
            if attempt == retries-1:
                LOG.append({'url':url,'erro':msg,'tentativas':retries})
                raise RuntimeError(msg) from e
            pace(penalty=min(180, 30 * 2 ** attempt) + random.random() * 5)

def norm(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')

TERMS = ['software','licenca','licenciamento','subscri','assinatura','saas','plataforma','sistema','aplicativo','antivirus','antimalware','backup','nuvem','cloud','adobe','acrobat','corel','autodesk','autocad','sketchup','microsoft','office','windows','chatgpt','chat gpt','openai','claude','canva','gemini','copilot','power bi','zoom','teamviewer','anydesk','kaspersky','eset','bitdefender','sophos','fortinet','veeam','vmware','red hat','oracle','qlik','tableau','arcgis','esri','revit','zabbix','nitro pdf','foxit','grammarly','perplexity','midjourney','envato','freepik','shutterstock','figma','notion','docusign','clicksign','google workspace','crm','automacao','integracao de sistemas','whatsapp api','voip','dashboard','business intelligence','desenvolvimento de software','trafego pago','marketing digital','agencia de marketing','landing page','copywriting','erp','gateway de pagamento','recrutamento e selecao']

def relevant(d):
    s = norm((d.get('objetoCompra') or '') + ' ' + (d.get('informacaoComplementar') or ''))
    return any(t in s for t in TERMS)

def main():
    base='https://pncp.gov.br/api/consulta/v1/contratacoes/proposta?dataFinal=20991231&tamanhoPagina=50&pagina='
    first=fetch(base+'1')
    pages=first['totalPaginas']
    rows=first['data']
    failures=[]
    print('TOTAL',first['totalRegistros'],'PAGINAS',pages,flush=True)
    with cf.ThreadPoolExecutor(max_workers=4) as pool:
        jobs={pool.submit(fetch,base+str(p)):p for p in range(2,pages+1)}
        for i,f in enumerate(cf.as_completed(jobs),2):
            try: rows.extend(f.result()['data'])
            except Exception as e: failures.append({'pagina':jobs[f],'erro':str(e)})
            if i%50==0: print('PAGINAS',i,'REGISTROS',len(rows),'FALHAS',len(failures),flush=True)
    unique={r['numeroControlePNCP']:r for r in rows}
    selected=[r for r in unique.values() if relevant(r)]
    (DATA/'propostas_todas.json').write_text(json.dumps(list(unique.values()),ensure_ascii=False))
    (DATA/'candidatas_objeto.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2))
    (DATA/'coleta_resumo.json').write_text(json.dumps({'totalDeclarado':first['totalRegistros'],'paginas':pages,'coletados':len(rows),'unicos':len(unique),'candidatas':len(selected),'falhas':failures,'consultadoEm':dt.datetime.now().astimezone().isoformat()},ensure_ascii=False,indent=2))
    (DATA/'fontes_propostas.json').write_text(json.dumps(LOG,ensure_ascii=False,indent=2))
    print('CONCLUIDO',len(unique),'CANDIDATAS',len(selected),'FALHAS',len(failures),flush=True)

if __name__=='__main__':main()
