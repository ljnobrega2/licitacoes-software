# Licitações — aplicação operacional

Publicado: https://licitacoes-tr-assistant.lucasjesusnobrega.workers.dev/

Cloudflare Worker serve `../app` e API na mesma origem. D1 armazena catálogo, contas, sessões, convites, etapas, responsáveis, tarefas, comentários, histórico, orçamento e estudos. Workers AI extrai PDF e usa `@cf/meta/llama-3.3-70b-instruct-fp8-fast`. Não requer chave OpenAI.

## Desenvolvimento e publicação

```sh
cd tr-assistant
npm ci
npx wrangler types
npm run typecheck
npm test
npx wrangler d1 migrations apply licitacoes-team --local
npm run dev
# Em outro terminal, na raiz: node tests/team-flow.mjs
```

Importação inicial (somente uma vez): na raiz, `node scripts/prepare_workspace.mjs`; depois, nesta pasta, `npx wrangler d1 execute licitacoes-team --local --file ../dados/workspace-import.sql`. O script gera convites privados em `dados/workspace-access.json`; não publique esse arquivo ou o SQL gerado. O convite administrativo permite criar o primeiro administrador com nome, e-mail e senha próprios.

```sh
npx wrangler d1 migrations apply licitacoes-team --remote
npm run deploy
```

Ao mudar de conta Cloudflare, crie outro D1 e ajuste o ID. Requer permissões Workers, D1 e Workers AI. Uso de IA e infraestrutura está sujeito à cota e cobrança da conta Cloudflare. O teste remoto cria contas QA; limpe exclusivamente os registros de teste após executar.

## Segurança e limites

- Cadastro somente por convite aleatório de uso único; papel administrativo vem do banco, nunca do cliente.
- Senhas derivadas com PBKDF2/SHA-256, salt individual e 100 mil iterações. Sessões aleatórias têm apenas hash no banco, cookie Secure/HttpOnly/SameSite=Lax e validade de 14 dias.
- Escritas exigem origem exata. Dados da equipe e ações de IA/download exigem sessão. Catálogo público não contém orçamento, comentários ou membros.
- Limites: 12 tentativas de acesso por IP/5 minutos, 15 estudos por pessoa/hora, 10 atualizações oficiais por pessoa/5 minutos. Sem recuperação automática de senha nesta versão; manter o convite administrativo privado.
- Downloads aceitam HTTPS PNCP, validam redirecionamentos e limitam arquivo a 15 MB. Texto extraído é cacheado; acima de 58 mil caracteres a análise avisa que usou um trecho parcial.
- Controle otimista de versão responde 409 quando a ficha foi editada por outra pessoa. É um espaço compartilhado único, não uma plataforma multiempresa.

## Atualização das fontes

Cron a cada minuto, até oito páginas por execução, intervalo de três segundos, cursor por UF/página e lease para evitar ciclos simultâneos. Percorre propostas abertas em 27 UFs. Após concluir o ciclo, aguarda seis horas. Cada registro mantém data da consulta oficial; a importação não disfarça dados antigos como novos. Anexos e itens são consultados sob demanda pela ficha.

Cobertura de fontes externas e atas permanece a do acervo importado; não representa uma coleta exaustiva de todos os portais brasileiros. Cada edital deve ser conferido no portal da disputa antes de participar. Lance mínimo e IA são simulações, não envio de propostas nem cotação de fornecedores.
