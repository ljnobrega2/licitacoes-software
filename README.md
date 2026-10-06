# Licitações de software — Brasil

Levantamento de 06/10/2026. Pasta de pesquisa e exportação de dados públicos; não é uma aplicação implantada.

## Para começar

- Abra `Licitacoes_software_Brasil_2026-10-06.xlsx`, abas **Leia primeiro** e **Comece aqui**.
- O resumo quantitativo está em `dados/estatisticas_finais.json`.
- Os registros consolidados estão em `dados/resultado_final.json`.
- Os CSVs ficam em `csv/`.
- Editais prioritários baixados e textos extraídos ficam em `editais_prioritarios/`.
- Dados oficiais, detalhes de contratações e auditoria das consultas ficam em `dados/`.
- Os scripts de coleta, triagem e exportação ficam em `scripts/`.

## Continuidade no Claude

Leia o handoff salvo em:

`/var/folders/0t/rb30_h7109z0j45cm5fxp5600000gt/T/handoff-licitacoes-software-2026-10-06.md`

Esse arquivo está na pasta temporária do macOS por orientação da habilidade handoff. Os dados, a planilha e os scripts permanecem nesta pasta do projeto.

Objetivo do usuário: encontrar todas as oportunidades brasileiras para fornecer/revender licenças e assinaturas de sistemas, em todas as esferas e localidades, incluindo abertas, futuras anunciadas e atas vigentes. O levantamento atual **não é exaustivo**: há falhas documentadas de consulta e portais externos ainda sem cobertura integral. Atas não representam nova disputa para qualquer fornecedor; classificação como licença comercial não comprova autorização de revenda.

## Regenerar a planilha

Ambiente Python utilizado nesta sessão:

```sh
/tmp/licitacoes-20261006-venv/bin/python scripts/gerar_entrega.py
```

Se o ambiente temporário tiver sido removido:

```sh
python3 -m venv .venv
.venv/bin/pip install openpyxl pypdf
.venv/bin/python scripts/gerar_entrega.py
```

A exportação recalcula o status dos prazos usando a hora atual de Brasília, mas **não atualiza os dados remotos**. Não apresentar uma planilha regenerada a partir do cache como uma nova consulta ao PNCP. Para uma nova coleta, corrigir/expirar o cache e preservar a fotografia de 06/10/2026.

## Limites e prioridades

- `scripts/coletar.py`: tentativa de percorrer toda a API de propostas; foi interrompida devido às falhas de rede. Não retomar sem corrigir recuperação e registro de progresso.
- `scripts/buscar.py` e `scripts/recuperar_buscas.py`: buscas nacionais por termos/marcas, com paginação e resultados parciais preservados.
- `scripts/triagem.py`: heurísticas; revisar falsos positivos e duplicidades antes de afirmar viabilidade comercial.
- `scripts/enriquecer.py`: itens e documentos de candidatos selecionados; não representa leitura integral de todos os editais.
- `scripts/gerar_entrega.py`: exporta XLSX/CSV, mantém observações manuais das oportunidades verificadas e valida contagens da planilha.
- A aba **Cobertura das buscas** registra falhas. Consultar também os JSONs de auditoria.
- A aba **Itens para cotar** preserva a unidade do edital. A coluna amarela recebe o custo efetivo, incluindo despesas. Lance mínimo = custo ÷ 0,79 para imposto de 6% e margem de 15% sobre a venda.
- Nenhum lance, compra, cadastro externo ou monitoramento automático foi realizado.

## Atualização de 06/10/2026 (2ª sessão)

- **Painel**: `painel/index.html` + `painel/dados.js` (gerado por `scripts/gerar_entrega.py`). Abas: abertas, atas vigentes, fora do PNCP, revisar, vencidas, cobertura. Filtros, paginação, ficha com itens, documentos e cálculo de lance mínimo. Marcações pessoais ficam no navegador (localStorage). Para abrir local: `python3 -m http.server -d painel 8000`.
- **Varredura por UF** (`scripts/coletar_uf.py`): API de propostas abertas percorrida nas 27 UFs, 38.042 contratações, nenhuma página falha. Resumo em `dados/coleta_uf_resumo.json`. Lê só o objeto; marca citada apenas em item ou anexo depende das buscas por termo.
- **Limite de taxa do PNCP**: as "quedas de conexão" (curl 56) e HTTP 429 são limitação de taxa. Medido: 1 requisição a cada ~3 s passa; 1 a cada 0,8 s é bloqueada. `fetch()` em `scripts/coletar.py` agora tem ritmo global entre processos (`dados/.ritmo`) e espera crescente.
- **Buscas por termo** (`scripts/recuperar_lacunas.py`): refaz termos que falharam e acrescenta ~130 termos. **Incompleta**: a busca `/api/search` continua derrubando conexões; a parte de editais parou perto do termo "Project" e a parte de atas não rodou. Ver `dados/lacunas_resumo.json` e a aba Cobertura.
- **Fontes fora do PNCP**: `scripts/buscar_pcp.py` (Portal de Compras Públicas, API pública) e `scripts/buscar_sebrae.py` (Canal do Fornecedor SEBRAE). Sem cobertura: Licitações-e (403), Caixa (captcha), Petronect, demais entidades do Sistema S, BLL/BNC/Licitanet/ComprasBR.
- `scripts/triagem.py`: `load_rows()` agora aceita registros da API de consulta (`from_consulta`) e escolhe a versão mais recente de cada controle.
- A entrega das 17h02 está preservada em `snapshot_2026-10-06_1702/`.
- O cache bruto das consultas não vai para o Git (ver `.gitignore`); os scripts o refazem.

Ordem para refazer tudo: `coletar_uf.py` → `recuperar_lacunas.py` → `buscar_pcp.py` → `buscar_sebrae.py` → `triagem.py` → `enriquecer.py` → `gerar_entrega.py`.
