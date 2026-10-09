interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  ALLOWED_ORIGIN?: string;
  ALLOWED_DOCUMENT_HOSTS?: string;
}

const json = (body: unknown, status = 200, origin = '') => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}) },
});

function allowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get('Origin') || '';
  return origin === (env.ALLOWED_ORIGIN || '') ? origin : '';
}

function safeDocumentUrl(raw: unknown, env: Env) {
  if (typeof raw !== 'string' || raw.length > 2000) return null;
  try {
    const url = new URL(raw);
    const hosts = (env.ALLOWED_DOCUMENT_HOSTS || 'pncp.gov.br').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
    if (url.protocol !== 'https:' || !hosts.some(host => url.hostname === host || url.hostname.endsWith(`.${host}`))) return null;
    return url.toString();
  } catch { return null; }
}

function answerFrom(response: any) {
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();
  for (const item of response.output || []) for (const content of item.content || []) {
    if (content.type === 'output_text' && content.text) return content.text;
  }
  return '';
}

type RequestBody = {
  documentUrl?: unknown;
  documentName?: unknown;
  question?: unknown;
  assumptions?: unknown;
  opportunityId?: unknown;
};

async function askOpenAI(env: Env, documentUrl: string, filename: string, instruction: string) {
  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-4.1-mini', store: false, input: [{ role: 'user', content: [{ type: 'input_file', file_url: documentUrl, filename, detail: 'low' }, { type: 'input_text', text: instruction }] }] }),
  });
  const result: any = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error(result?.error?.message || 'A IA não conseguiu ler este documento.');
  return answerFrom(result) || 'Não foi possível extrair uma resposta do documento.';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}), 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });
    }
    const path = new URL(request.url).pathname;
    if (request.method !== 'POST' || !['/ask', '/estimate'].includes(path)) return json({ error: 'Rota não encontrada.' }, 404, origin);
    if (!origin) return json({ error: 'Origem não permitida.' }, 403);
    if (!env.OPENAI_API_KEY) return json({ error: 'Assistente não configurado.' }, 503, origin);

    let body: RequestBody;
    try { body = await request.json(); } catch { return json({ error: 'JSON inválido.' }, 400, origin); }
    const documentUrl = safeDocumentUrl(body.documentUrl, env);
    const filename = typeof body.documentName === 'string' ? body.documentName.slice(0, 180) : 'documento.pdf';
    if (!documentUrl) return json({ error: 'O documento precisa ser um URL HTTPS de fonte autorizada.' }, 400, origin);
    try {
      if (path === '/ask') {
        const question = typeof body.question === 'string' ? body.question.trim() : '';
        if (!question || question.length > 1600) return json({ error: 'A pergunta deve ter entre 1 e 1.600 caracteres.' }, 400, origin);
        const prompt = `Você é um analista de licitações. Responda em português do Brasil SOMENTE com base no documento anexado. Seja objetivo. Diferencie fatos do documento de inferências. Se a informação não estiver no documento, diga claramente que não foi localizada. Não dê aconselhamento jurídico definitivo e recomende conferência humana para habilitação, prazos, impugnação e proposta. Pergunta: ${question}`;
        return json({ answer: await askOpenAI(env, documentUrl, filename, prompt) }, 200, origin);
      }
      const assumptions = typeof body.assumptions === 'string' ? body.assumptions.trim() : '';
      if (assumptions.length > 1600) return json({ error: 'As premissas devem ter no máximo 1.600 caracteres.' }, 400, origin);
      const prompt = `Você é um analista comercial de licitações de software. Com base SOMENTE no documento anexado e nas premissas do usuário, produza uma ESTIMATIVA PRELIMINAR DE CUSTO em português do Brasil. Não invente preços de fornecedores nem quantidades ausentes. Separe: 1) escopo e quantidades confirmados no documento; 2) componentes de custo a cotar (licenças, implantação, horas, suporte, impostos e contingência); 3) cálculo ou faixa apenas quando os valores necessários estiverem explícitos; 4) lacunas e perguntas para fechar a cotação; 5) riscos comerciais. Diferencie fato, inferência e hipótese. Diga que não é preço de proposta nem substitui cotação de fornecedor. Premissas do usuário: ${assumptions || 'Nenhuma premissa adicional informada.'}`;
      return json({ answer: await askOpenAI(env, documentUrl, filename, prompt) }, 200, origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'A IA não conseguiu analisar este documento.';
      return json({ error: message }, 502, origin);
    }
  },
};
