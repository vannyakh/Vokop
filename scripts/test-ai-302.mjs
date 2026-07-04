/**
 * Smoke-test 302.AI key + ai-content endpoints.
 * Usage: node --env-file=.env scripts/test-ai-302.mjs
 * Does not print secrets.
 */

const key = process.env.AI_302_API_KEY ?? '';
const baseUrl = (process.env.AI_302_BASE_URL ?? 'https://api.302.ai').replace(/\/+$/, '');
const model = process.env.AI_302_MODEL ?? 'gpt-4o-mini';
const aiUrl = process.env.AI_CONTENT_URL ?? 'http://localhost:4005';

function mask(value) {
  if (!value) return '(missing)';
  if (value.length < 12) return '***';
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

async function testDirect302() {
  console.log('\n== Direct 302.AI chat ==');
  console.log(`key: ${mask(key)}`);
  console.log(`base: ${baseUrl}`);
  console.log(`model: ${model}`);

  if (!key) {
    console.log('FAIL: AI_302_API_KEY is not set');
    return false;
  }

  const url = baseUrl.endsWith('/v1')
    ? `${baseUrl}/chat/completions`
    : `${baseUrl}/v1/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly: pong' }],
      temperature: 0,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log(`FAIL: HTTP ${res.status}`);
    console.log(typeof body.error === 'object' ? body.error.message ?? JSON.stringify(body.error) : body.error ?? body.message ?? 'unknown error');
    return false;
  }

  const text = body.choices?.[0]?.message?.content?.trim() ?? '';
  console.log(`OK: ${text.slice(0, 120)}`);
  return true;
}

async function testService(pathName, init) {
  const res = await fetch(`${aiUrl}${pathName}`, init);
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function testAiContent() {
  console.log('\n== ai-content service ==');
  console.log(`url: ${aiUrl}`);

  try {
    const health = await testService('/health');
    console.log(`health: HTTP ${health.status} status=${health.body.status ?? 'n/a'} service=${health.body.service ?? 'n/a'}`);
    if (health.status === 0 || health.status >= 500 && !health.body.service) {
      console.log('SKIP service tests (ai-content not reachable)');
      return false;
    }
  } catch (err) {
    console.log(`SKIP service tests (${err instanceof Error ? err.message : err})`);
    return false;
  }

  const caps = await testService('/ai/capabilities');
  console.log(`capabilities: HTTP ${caps.status}`);
  if (caps.body.features) {
    for (const f of caps.body.features) {
      console.log(`  - ${f.feature}: ${f.available ? 'available' : 'unavailable'} (${f.preferredProvider ?? '-'}/${f.preferredModel ?? '-'})`);
    }
  } else if (caps.body.error) {
    console.log(`  error: ${caps.body.error}`);
  }

  const providers = await testService('/ai/llm/providers');
  console.log(`providers: HTTP ${providers.status}`);
  for (const p of providers.body.providers ?? []) {
    console.log(`  - ${p.id}: ${p.configured ? 'configured' : 'not configured'} default=${p.defaultModel}`);
  }

  const text = await testService('/ai/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'hello world from vokop',
      task: 'polish',
      provider: '302ai',
      model,
    }),
  });
  console.log(`text/polish: HTTP ${text.status}`);
  if (text.body.text) {
    console.log(`  OK provider=${text.body.provider} model=${text.body.model}`);
    console.log(`  result: ${String(text.body.text).slice(0, 160)}`);
  } else {
    console.log(`  error: ${text.body.error ?? JSON.stringify(text.body).slice(0, 200)}`);
  }

  const translate = await testService('/ai/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Good morning',
      targetLanguage: 'Spanish',
      provider: '302ai',
      model,
    }),
  });
  console.log(`translate: HTTP ${translate.status}`);
  if (translate.body.translatedText) {
    console.log(`  OK: ${String(translate.body.translatedText).slice(0, 120)}`);
  } else {
    console.log(`  error: ${translate.body.error ?? JSON.stringify(translate.body).slice(0, 200)}`);
  }

  const llm = await testService('/ai/llm/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Say hi in one word.',
      provider: '302ai',
      model,
      temperature: 0,
    }),
  });
  console.log(`llm/complete: HTTP ${llm.status}`);
  if (llm.body.text) {
    console.log(`  OK: ${String(llm.body.text).slice(0, 120)}`);
  } else {
    console.log(`  error: ${llm.body.error ?? JSON.stringify(llm.body).slice(0, 200)}`);
  }

  return text.status === 200 && translate.status === 200 && llm.status === 200;
}

const directOk = await testDirect302();
const serviceOk = await testAiContent();

console.log('\n== Summary ==');
console.log(`302.AI direct: ${directOk ? 'PASS' : 'FAIL'}`);
console.log(`ai-content:    ${serviceOk ? 'PASS' : 'FAIL / SKIP'}`);
process.exit(directOk ? 0 : 1);
