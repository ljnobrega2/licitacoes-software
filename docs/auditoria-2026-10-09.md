# Auditoria e publicação — 09/10/2026

## Problemas constatados e correções

| Problema anterior | Correção publicada |
| --- | --- |
| Tela inicial era a tabela, apesar do pedido de Kanban | Quadro de oito etapas como tela inicial, arrastar e seletor de etapa |
| Marcações apenas no navegador | D1 compartilhado, contas individuais e convites de uso único |
| IA dependia de backend não configurado | Workers AI ativo, extração de PDF oficial e estudos persistidos |
| Sem coordenação da equipe | Responsáveis, tarefas com prazo, pendências documentais, comentários e histórico |
| Edição poderia sobrescrever outro colega | Atualização condicional por versão; conflito retorna 409 |
| Lista de abertas misturava vencidas | Filtro de prazo em Brasília; casos já trabalhados preservados em sua etapa |
| Data de exportação parecia data da fonte | Data de consulta por registro e progresso real do ciclo de coleta |
| Arquivos só abriam URL externa | Download autenticado de arquivo oficial, domínio validado e tamanho limitado |
| Orçamento limitado a conta fixa | Componentes, horas, contingência, custo por item, margem e tributos configuráveis |
| Nenhuma atualização operacional | Cron PNCP com paginação, lease, checkpoint e retomada |

## Evidências de validação

- `npm run typecheck`: passou; quatro testes de datas e orçamento passaram.
- `tests/team-flow.mjs`: passou localmente e no endereço público, com dois contextos independentes de navegador, cadastro por convite, responsável compartilhado, etapas, tarefa documental, comentário, orçamento, rejeição de edição antiga e conclusão de tarefa pela segunda pessoa.
- Capturas desktop 1600 px e mobile 390 px, sem exceções JavaScript no fluxo. Todos os oito estágios estavam renderizados.
- `tests/production-features.mjs`: atualização real do registro PNCP `78316064000193-1-000033/2026`, download PDF oficial de 1.107.895 bytes, extração de texto e estimativa real de IA de 2.863 caracteres, persistida em D1. Não foi usado resultado simulado de IA.
- Cursor remoto comprovou 1.950 processos consultados na primeira coleta nova, com resposta oficial em `2026-10-09T16:35:38.157Z`. A coleta continuou em segundo plano; esse número não representa uma varredura nacional concluída.
- Contas e registros artificiais usados pelos testes foram identificados pelo prefixo/e-mail QA e removidos antes da entrega. O catálogo oficial e o cache de texto do edital foram preservados.

## Limites explícitos

É um espaço único para esta equipe. Não há recuperação de senha, edição/exclusão de tarefas ou perfis empresariais independentes nesta versão. Convites novos são de membro; o primeiro acesso administrativo é privado. Não envia lances, não garante compatibilidade jurídica ou técnica e não substitui validação de preços. IA distingue premissas de informação documental; textos longos podem ser parciais. Cobertura externa e atas ainda são históricas. Uso da infraestrutura e da IA consome a cota da conta Cloudflare.
