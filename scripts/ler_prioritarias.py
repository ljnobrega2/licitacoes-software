from triagem import *
from pypdf import PdfReader
import io
import zipfile

IDS=['43976166000150_2026_89','83102228000110_2026_108','07842278000155_2026_13','78316064000193_2026_33','11552755000115_2026_47','88488366000100_2026_400','24134488000108_2026_155','82804212000196_2026_324','62759595000110_2026_41','00394452000103_2026_21390']
OUT=ROOT/'editais_prioritarios';OUT.mkdir(exist_ok=True)

def download(task):
    ident,doc=task
    url=doc['url'];stem=ident+'_'+str(doc['sequencialDocumento'])
    try:
        p=OUT/(stem+'.pdf')
        if p.exists():raw=p.read_bytes()
        else:raw=subprocess.check_output(['curl','-fLsS','--max-time','20',url],stderr=subprocess.PIPE)
        if raw[:4]==b'%PDF':
            p.write_bytes(raw)
            text='\n'.join('\n[PÁGINA '+str(i+1)+']\n'+(page.extract_text() or '') for i,page in enumerate(PdfReader(io.BytesIO(raw)).pages))
        elif raw[:2]==b'PK':
            (OUT/(stem+'.zip')).write_bytes(raw);texts=[]
            with zipfile.ZipFile(io.BytesIO(raw)) as z:
                for name in z.namelist():
                    if name.lower().endswith('.pdf'):
                        b=z.read(name);reader=PdfReader(io.BytesIO(b));texts.append('\n[DOCUMENTO '+name+']\n'+'\n'.join(p.extract_text() or '' for p in reader.pages))
            text='\n'.join(texts)
        else:raise ValueError('Formato não PDF/ZIP')
        (OUT/(stem+'.txt')).write_text(text)
        terms=r'revenda|autorizad|fabricante|broker|titularidade|compartilhad|subcontrata|exclusiv|microempresa|prazo de entrega|vigencia|12 meses|12 \(doze\)'
        hits=[]
        for m in re.finditer(terms,norm(text)):
            hits.append(text[max(0,m.start()-100):m.end()+300].replace('\n',' '))
        return {'id':ident,'titulo':doc['titulo'],'url':url,'arquivo':p.name,'trechos':hits[:60]}
    except Exception as e:return {'id':ident,'titulo':doc['titulo'],'url':url,'erro':str(e)}

def main():
    tasks=[]
    for ident in IDS:
        p=DATA/'detalhes'/(ident+'.json')
        if not p.exists():continue
        d=json.loads(p.read_text())
        docs=[f for f in d.get('arquivos',[]) if f.get('statusAtivo') and (f.get('tipoDocumentoId') in [1,2,4] or re.search('edital|referencia',norm(f.get('titulo',''))))]
        tasks.extend((ident,f) for f in docs[:3])
    with cf.ThreadPoolExecutor(max_workers=3) as pool:out=list(pool.map(download,tasks))
    (DATA/'leitura_prioritarias.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
    for x in out:print(x['id'],x['titulo'],'ERRO' if 'erro' in x else len(x['trechos']),flush=True)

if __name__=='__main__':main()
