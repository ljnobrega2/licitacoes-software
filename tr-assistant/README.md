# Assistente de TR

Backend seguro do painel para perguntas e estimativa preliminar de custo a partir de um TR, edital ou aviso listado no PNCP. A chave da OpenAI fica exclusivamente no Worker; o navegador manda somente a URL oficial do documento e a pergunta ou premissas de custo.

## Publicar

```sh
cd tr-assistant
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

Depois, copie a URL exibida pelo deploy para `painel/config.js` em `RADAR_TR_API` e publique esse arquivo no GitHub Pages.

`ALLOWED_ORIGIN` restringe o painel autorizado. `ALLOWED_DOCUMENT_HOSTS` restringe os documentos por domínio; por padrão, apenas `pncp.gov.br` e seus subdomínios são aceitos. Acrescente domínios oficiais separados por vírgula se uma fonte externa passar a fornecer documentos.

Os endpoints `POST /ask` e `POST /estimate` usam a Responses API com o PDF por URL, em modo `low` para controlar custo. A estimativa separa o que está no documento de hipóteses e lacunas; não substitui cotações de fornecedor ou validação humana. Cada consulta é independente e o Worker não armazena documento, pergunta ou resposta (`store: false`). Antes de usar em escala, inclua autenticação por usuário e limitação de taxa.
