# Assistente de TR

Backend seguro do painel para perguntas sobre um TR, edital ou aviso listado no PNCP. A chave da OpenAI fica exclusivamente no Worker; o navegador manda somente a URL oficial do documento e a pergunta.

## Publicar

```sh
cd tr-assistant
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

Depois, copie a URL exibida pelo deploy para `painel/config.js` em `RADAR_TR_API` e publique esse arquivo no GitHub Pages.

`ALLOWED_ORIGIN` restringe o painel autorizado. `ALLOWED_DOCUMENT_HOSTS` restringe os documentos por domínio; por padrão, apenas `pncp.gov.br` e seus subdomínios são aceitos. Acrescente domínios oficiais separados por vírgula se uma fonte externa passar a fornecer documentos.

O endpoint usa a Responses API com o PDF por URL, em modo `low` para controlar custo. Cada pergunta é independente e o Worker não armazena documento, pergunta ou resposta (`store: false`). Antes de usar em escala, inclua autenticação por usuário e limitação de taxa.
