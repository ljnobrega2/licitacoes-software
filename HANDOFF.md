# Estado do projeto — aplicação publicada em 09/10/2026

Operação atual: https://licitacoes-tr-assistant.lucasjesusnobrega.workers.dev/ . Código em `app/` e `tr-assistant/`; instruções em `tr-assistant/README.md`; auditoria e evidências em `docs/auditoria-2026-10-09.md`. Banco D1, conta individual por convite, Kanban inicial, tarefas, comentários, orçamento e IA real compartilhados. Cron PNCP ativo, primeira varredura nova em andamento; não confundir os números históricos abaixo com o estado do banco atual. Credenciais de bootstrap em arquivo local ignorado `dados/workspace-access.json`; nunca publicar esse arquivo.

## Registro histórico — 06/10/2026, 19h50 (Brasília)

Objetivo: achar licitações brasileiras de licenças e assinaturas de software para fornecimento/revenda, em todas as esferas e UFs, incluindo abertas, futuras e atas vigentes. Levantamento **não exaustivo**.

## Números da última exportação

Referência: `dados/estatisticas_finais.json`.

- 11.076 registros PNCP únicos reunidos.
- 584 candidatos com prazo aberto ou futuro: 148 licenças comerciais com marca, 208 softwares sem marca, 228 soluções com serviços. Mais 13 possíveis duplicidades.
- 1.094 atas vigentes (não atualizadas nesta sessão).
- 405 contratações com itens e lista de documentos consultados; 1.964 itens para cotar.
- Fora do PNCP: 37 processos no Portal de Compras Públicas (7 não localizados no PNCP coletado) e 15 do SEBRAE (4 com sessão futura).

## Feito

- Varredura completa da API de propostas abertas, UF por UF: 38.042 contratações, zero páginas falhas (`scripts/coletar_uf.py`).
- Adaptador que leva registros da API de consulta para a triagem (`from_consulta` em `scripts/triagem.py`).
- Painel HTML em `painel/` gerado por `scripts/gerar_entrega.py`.
- Coletores do Portal de Compras Públicas e do SEBRAE.

## Falta

1. **Buscas por termo** (`scripts/recuperar_lacunas.py`): a parte de editais parou perto do termo "Project"; a parte de atas não rodou. O endpoint `/api/search` derruba conexões mesmo em ritmo baixo. O ritmo e a penalidade são globais (`dados/.ritmo`), então uma URL que falha repetidamente trava os outros coletores por minutos. Separar a penalidade por endpoint antes de retomar.
2. **Detalhes**: 198 candidatas ativas das classes "sistema com serviços" e "hardware/solução integrada" não têm itens nem documentos, porque `scripts/enriquecer.py` só seleciona licenças comerciais e softwares sem marca.
3. **Fontes sem cobertura**: Licitações-e (HTTP 403), Licitações Caixa (captcha), Petronect (lista em JavaScript), SESI/SENAI/SESC/SENAC/SEST-SENAT (portais regionais), BLL/BNC/Licitanet/ComprasBR (busca por formulário).
4. **Triagem**: heurística por objeto. Revisar falsos positivos e descobrir marca/SKU nos termos de referência dos "softwares sem marca".
5. **Monitoramento automático**: não existe. Cada execução é uma fotografia.

## Cuidados técnicos

- Limite de taxa do PNCP, medido: 1 requisição a cada ~3 s passa; 1 a cada 0,8 s recebe 429 ou queda de conexão (curl 56). `INTERVALO` em `scripts/coletar.py` está em 2,5 s.
- O cache de `fetch()` não expira. Para atualizar de verdade, apagar o cache ou usar `fresh=True`. O cache bruto não vai para o Git.
- Resposta vazia (204) vira objeto com listas vazias; `gerar_entrega.py` normaliza itens e arquivos.
- `gerar_entrega.py` recalcula o status dos prazos pela hora atual, mas não consulta a internet.
- Atas vigentes já têm fornecedor. Classificação como licença comercial não comprova autorização de revenda.

## Prazos mais próximos (revalidados às 17h33 de 06/10, sem alteração no cadastro)

- Araquari/SC, ChatGPT Business, 6 usuários: propostas até 07/10 08h. Controle `83102228000110-1-000108/2026`.
- Betim/MG (IPREMB), 12 ChatGPT Business, exclusivo ME/EPP: até 07/10 09h. Controle `07842278000155-1-000013/2026`.
- Américo Brasiliense/SP, 30 ChatGPT Business: até 08/10 08h. Controle `43976166000150-1-000089/2026`.
- Câmara de Londrina/PR, broker Claude e ChatGPT: sessão 16/10 13h30. Controle `78316064000193-1-000033/2026` (o 32 é duplicidade provável).

Observações de editais já lidos ficam no dicionário `MANUAL` de `scripts/gerar_entrega.py`.
