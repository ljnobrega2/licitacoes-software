# Auditoria de usabilidade — operação AD PRO

Esta é a terceira revisão de 09/10/2026. A publicação anterior está documentada em `auditoria-2026-10-09.md`; o pedido posterior mudou a entrada principal de Kanban para triagem rápida. O Kanban continua disponível, com todas as oito etapas.

## Método e escopo

Inspeção do código e do catálogo, percurso de tarefas em navegadores independentes, teste de gestos reais de toque, uso por teclado, revisão visual em 1440/1600 px e 390 px, regressões da API e verificação automatizada axe das regras WCAG 2 A/AA e 2.1 AA. Os fluxos abrangem consulta anônima, convite e entrada, triagem, objetivos, recusa e reversão, Kanban, responsáveis, tarefas, comentários, edital/TR, estudos de IA, orçamento, lances e exportação.

Não houve pesquisa com usuários finais nem certificação de acessibilidade. Ausência de violações automatizadas não comprova conformidade integral. Também não foi realizada uma auditoria jurídica da habilitação ou dos editais.

## Achados e mudanças implementadas

| Prioridade | Achado | Correção |
| --- | --- | --- |
| Crítica | Produto de limpeza rotulado Autodesk | O padrão `revit` encontrava o trecho de **revitalizar**. Correspondência por palavra inteira, classificação compartilhada por frontend/coleta/API e reclassificação dos registros existentes na leitura. |
| Alta | Tudo parecia uma oportunidade AD PRO | Escopo digital como padrão; soluções mistas de hardware/obra separadas para revisão; acervo fora do escopo acessível apenas por filtro explícito. Trabalho já iniciado é preservado, com aviso. |
| Alta | Triagem dependia de vários campos e seleção de etapa | Tela inicial de um cartão por vez: direita/aceitar salva pisos e objetivo na mesma operação e abre o Kanban em Compatíveis; esquerda/recusar → escolha de motivo. Botões equivalentes e setas no teclado. |
| Alta | Não havia objetivo estruturado | Oito objetivos comerciais, por opções; sugestão inicial pode ser alterada. Persistência compartilhada e filtro por objetivo. |
| Alta | Recusa sem justificativa útil | Sete motivos predefinidos, exigidos também pela API. Objetivo, motivo e autor ficam no histórico. Lista de recusadas, reavaliação e desfazer última decisão, com proteção por versão. |
| Alta | Campos longos eram o centro da operação | Anotações, comentários, pergunta de IA, premissas, tarefa personalizada e detalhamento de custos são opcionais. Tarefas prontas e três comandos de IA dispensam digitação. |
| Alta | Lance sem ação clara ou diferença entre preparar/enviar | Ação nos cartões, aba Lances e sequência preço → portal → registro. Preparar nunca afirma enviar. Confirmação manual explícita é necessária para registrar envio. |
| Alta | Lance poderia ignorar o piso comercial | Validação no navegador **e** servidor; valores brasileiros e quatro casas decimais; total do contrato ou unitário do item; distribuição de custos compartilhados; bloqueio abaixo do piso. Sem custo, há aviso e confirmação explícita, nunca piso zero inventado. |
| Alta | Rascunhos desapareciam entre abas | Notas, orçamento, premissas, perguntas, comentário, tarefa e lance permanecem nesta aba. Aviso ao sair com alterações. Áreas opcionais abertas também preservam sua preferência. |
| Alta | Produtos, edital e IA exigiam sair da triagem | Cartão ampliado com abas Resumo, Produtos e unidades, Edital e TR e IA · dúvidas; painel de lance mínimo sempre visível, sem trocar de aba. PDF oficial servido inline, download e perguntas/estimativas na mesma tela. |
| Alta | Não havia piso comercial preenchível por produto | Piso unitário na primeira tela, por número de item, quatro casas decimais, persistido para a equipe. Pode ser salvo separadamente ou junto com o aceite. Piso efetivo é o maior entre informado e calculado. Soma de produtos só define o piso total quando todos têm preço e quantidade válidos. |
| Alta | Palavra VoIP trouxe um headset para a fila digital | Hardware puro sem evidência de serviço/software fica fora do escopo; soluções digitais combinadas com hardware seguem para revisão, não para a triagem padrão. |
| Alta | Regras importantes dos arquivos não estavam na tela inicial | Extração sob demanda de um resumo executivo do edital/TR no Resumo: escopo, entregáveis, unidade/período, preço, documentação, requisitos, prazo, pagamento e riscos. Fonte e limites explícitos; não se inventam detalhes ausentes. |
| Média | Uma atualização pendente podia voltar à aba anterior | Respostas antigas da ficha são descartadas por sequência; atualização após registrar envio preserva a aba em que a pessoa está trabalhando. |
| Alta | Cadastro podia ser confundido com disputa | PNCP não é aceito como endereço de envio de lance. Fonte do cadastro e portal oficial têm ações distintas. |
| Média | Tarefas não podiam ser corrigidas | Edição de título, responsável, prazo e tipo; arquivamento reversível no banco, preservando histórico. |
| Média | Etapas posteriores ficavam fora da área visível | Atalhos para cada coluna do Kanban, com contagem e foco. |
| Média | Consulta anônima parecia editável | Aviso de somente leitura, convite/entrada claros, controles de etapa desabilitados. |
| Média | Portal desaparecia no celular | Ações oficiais permanecem visíveis, layout sem overflow da página e alvos principais de toque de ao menos 44 px. |
| Média | Texto tinha contraste insuficiente | Corrigidos badges, metadados, colunas vazias, rodapé e ícones de documentos. |

## Escopo AD PRO e integridade do acervo

O classificador cobre os doze grupos de serviços descritos no projeto e as marcas de software. Não usa os badges antigos como evidência. Inclui objeto, informação complementar e descrição dos itens disponíveis. “Licença ambiental”, manutenção de ar-condicionado, seleção genérica de pessoal e automação física sem contexto digital não são consideradas oportunidades digitais.

Caso relatado: `46634598000171-1-000452/2026`, produto Limpa Pedras do Município de Tietê. É classificado **fora do escopo**, não Autodesk. O registro não é apagado: permanece disponível para auditoria. A correção de classificação não altera a data da última consulta oficial nem a transforma em uma consulta nova.

Sinal digital não significa habilitação confirmada, autorização de revenda ou adequação técnica. Conferir o edital continua necessário. A sugestão de objetivo é editável e não equivale a uma decisão da equipe.

## Fluxo operacional

1. Na Triagem rápida, selecionar o objetivo e definir o mínimo unitário de cada produto, sem mudar de aba. Campos opcionais e pisos ainda ausentes não são preenchidos automaticamente.
2. Conferir os produtos, edital/TR e dúvidas de IA no painel da mesma tela. O Resumo permite extrair os pontos críticos a partir de um arquivo disponível, citando a fonte; antes dessa leitura, não apresenta regras do edital como confirmadas.
3. Aceitar salva decisão e pisos pendentes juntos, atribui responsável apenas se ainda não existir e abre o Kanban em Compatíveis. Recusar exige motivo e permanece na fila de triagem. Desfazer a decisão também fica acessível no Kanban.
4. No Kanban, a equipe continua com responsáveis, tarefas e “Preparar lance”. O valor efetivo deve respeitar o piso salvo e a unidade definida no edital. Enviar é ação no portal oficial; registrar envio exige confirmação explícita.

## Lances e integrações: situação real

PNCP, consulta de arquivos, download oficial, atualização e estudo de PDF estão integrados. A preparação de valor, proteção de piso e acompanhamento da equipe foram implementados nesta revisão. O histórico distingue **preparado** de **envio informado pelo usuário**; este último não é confirmação do portal.

Não existe envio automático de lance por API nesta versão. Não foi recebido acesso autorizado a uma API oficial de disputa. Gratuidade de acesso ao portal não comprova que exista uma API gratuita para enviar lances. Nenhuma conta externa, assinatura paga ou lance real foi criado pelos testes.

A lista inicial de gratuidade verificada inclui o Compras.gov.br. Cadastro e envio continuam usando a conta própria do fornecedor no portal, sem pedir senha gov.br neste sistema. Outros endereços podem ser usados para acesso assistido, mas não são anunciados como gratuitos ou como integrações de envio sem verificação.

Fontes primárias: [cartilha do fornecedor Compras.gov.br](https://www.gov.br/compras/pt-br/fornecedor/micro-e-pequenas-empresas-1/fornecedor/cartilha-do-fornecedor), [cadastro SICAF](https://www.gov.br/pt-br/servicos/cadastrar-se-como-fornecedor-da-administracao-publica), [perguntas e respostas PNCP](https://www.gov.br/pncp/pt-br/pncp/perguntas-e-respostas).

## Testes e evidências

- `npm run typecheck` e `npm test`: tipagem e regressões de datas, escopo AD PRO, moeda e piso.
- `tests/team-flow.mjs`: duas pessoas, responsabilidade, etapa, checklist, comentário, orçamento, conflito de versão e conclusão compartilhada.
- `tests/bid-flow.mjs`: piso bloqueado em cliente/API, rascunho, preparo, repetição idempotente, confirmação manual, edição/arquivamento de tarefas e acesso móvel.
- `tests/triage-flow.mjs`: piso inicial, bloqueio de valor inválido, aceite atômico de piso/objetivo com passagem ao Kanban, recusar com motivo, histórico, reavaliar, filtro por objetivo, desfazer, teclado e toque real nos dois sentidos.
- `tests/usability-audit.mjs`: doze verificações de fluxo e sete telas verificadas com axe; na execução local final, todas passaram e nenhuma violação automatizada foi detectada.
- `tests/views-audit.mjs`: entrada e oito telas complementares, mais larguras 320, 390, 768 e 1600 px. Sem violações automatizadas ou overflow da página na execução local.
- `tests/inline-flow.mjs`: piso unitário sempre visível e persistido, resumo dos pontos importantes do edital/TR, rascunhos entre abas, PDF real e cabeçalhos de visualização inline, pergunta/material preservados e troca de aba enquanto a IA trabalha. A execução local simula apenas a resposta do modelo para testar a interface; a execução pública usa `TEST_REAL_AI=1` para não simular IA.
- Testes de lances somente preparam e registram dados internos de QA. Não acessam a sessão de fornecedor e não enviam propostas ao governo.

### Conferência no endereço público

Versão `2026.10.09-team-4`, publicada em `https://licitacoes-tr-assistant.lucasjesusnobrega.workers.dev/`.

- Trabalho compartilhado entre duas contas confirmado no endereço público.
- Na versão 4, `triage-flow.mjs` confirmou piso visível no Resumo, rejeição de valor inválido, aceite salvando preço/objetivo no mesmo PATCH e abertura imediata do Kanban. Desfazer, recusa, teclado e gestos reais de toque passaram.
- Piso em cliente e servidor, preparação, confirmação manual e tarefas editáveis/arquiváveis passaram publicamente, sem exceções JavaScript.
- `inline-flow.mjs` passou com `TEST_REAL_AI=1`: piso unitário `147,1234` persistido, PDF oficial servido inline e pergunta ao modelo real com o PDF selecionado. A resposta ficou registrada em D1 e acessível após trocar de aba. A extração real dos pontos importantes do edital/TR na aba Resumo também passou, sem apagar a pergunta ou o material escolhido na aba de dúvidas. Os valores são exclusivamente de QA, não propostas reais.
- As sete telas principais e as nove verificações complementares passaram publicamente sem violações automatizadas axe. A verificação não inclui certificar a acessibilidade do conteúdo dos PDFs de terceiros.
- Download e estimativa de custo real sobre o edital de Londrina foram novamente confirmados: PDF de 1.107.895 bytes, resultado de 3.395 caracteres. Não foi usado resultado simulado nessa execução pública.
- O cadastro de equipamento de limpeza foi confirmado fora do escopo na API pública, sem marca Autodesk. Headsets para VoIP sem contratação digital também foram excluídos da triagem padrão.

## Segurança de publicação e limites restantes

Backup D1 completo antes das migrações: `dados/backups-operacao/2026-10-09-antes-triagem-rapida.sql`, privado, permissão 0600 e excluído do Git. O snapshot na interface continua disponível; exportação anônima não inclui dados privados da equipe.

Novo backup privado imediatamente antes da limpeza de QA: `dados/backups-operacao/2026-10-09-antes-limpeza-qa.sql`, 0600, também excluído do Git. A exportação D1 pode suspender brevemente as consultas; ela foi finalizada antes da repetição bem-sucedida dos fluxos públicos.

Migrações são aditivas. Histórico e catálogo são preservados; a limpeza de testes identifica exclusivamente contas QA e seus registros de teste.

Persistem: recuperação de senha não implementada; espaço único da equipe; coleta nacional pode estar em andamento; cobertura de atas e fontes externas histórica; documentos podem estar indisponíveis na origem; IA tem limites de tamanho/cota e suas faixas hipotéticas não substituem cotação; envio automático de lances depende de integração oficial autorizada. Uso de IA e infraestrutura consome a cota da conta Cloudflare, sem promessa de custo ilimitado zero.

O visualizador exige PDF real, de fonte PNCP autorizada e com até 15 MB, e autenticação. Anexos não PDF continuam disponíveis por download. Não se afirma existir TR separado quando a fonte só disponibiliza edital ou arquivo combinado.
