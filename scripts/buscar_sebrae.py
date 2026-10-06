"""Fonte externa (Sistema S): Canal do Fornecedor SEBRAE, listagem pública de licitações em andamento.

SEBRAE não publica no PNCP. Baixa a listagem nacional e grava dados/externo_sebrae.json (todas) para triagem local.
"""
from coletar import *

URL='https://www.scf3.sebrae.com.br/PortalCf/Licitacoes/GetLicitacoesGrid?draw=1&start=0&length=100&StatusId=5'
PORTAL='https://www.scf3.sebrae.com.br/PortalCf/Licitacoes'

def main():
    out=DATA/'externo';out.mkdir(exist_ok=True)
    ua='Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/129 Safari/537.36'
    jar=str(out/'sebrae.cookies')
    subprocess.check_call(['curl','-fsSL','--max-time','40','-A',ua,'-c',jar,'-o',str(out/'sebrae.html'),PORTAL])
    raw=subprocess.check_output(['curl','-fsS','--max-time','90','-A',ua,'-b',jar,'-H','X-Requested-With: XMLHttpRequest',URL])
    rows=json.loads(raw)['aaData']
    keep=['Id','Numero','NumeroProcesso','Objeto','StatusDescricao','SituacaoDescricao','DataHoraAberturaString','DataPublicacaoString','DataEncerramentoString','Local','TipoJulgamentoDescricao']
    slim=[]
    for r in rows:
        s={k:r.get(k) for k in keep}
        s['ModalidadeDescricao']=(r.get('LicitacaoModalidade') or {}).get('Descricao') if isinstance(r.get('LicitacaoModalidade'),dict) else None
        try:s['abertura']=dt.datetime.strptime(r.get('DataHoraAberturaNotAsString') or '','%d/%m/%Y %H:%M').isoformat()
        except ValueError:s['abertura']=None
        slim.append(s)
    (DATA/'externo_sebrae.json').write_text(json.dumps({'consultadoEm':dt.datetime.now().astimezone().isoformat(),'fonte':PORTAL,'filtro':'Situação = Em Andamento','total':len(slim),'licitacoes':slim},ensure_ascii=False,indent=1))
    print('SEBRAE',len(slim))

if __name__=='__main__':main()
