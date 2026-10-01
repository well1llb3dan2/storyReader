const { OLLAMA_HOST, LLAMA_CPP_HOST, DEFAULT_MODEL, DEFAULT_PROVIDER } = require('../config');

function normalizeProvider(provider = DEFAULT_PROVIDER) {
  return provider === 'llama.cpp' || provider === 'llama_cpp' ? 'llama.cpp' : 'ollama';
}

function getProviderLabel(provider) {
  return normalizeProvider(provider) === 'llama.cpp' ? 'llama.cpp' : 'Ollama';
}

function getProviderHost(provider) {
  return normalizeProvider(provider) === 'llama.cpp' ? LLAMA_CPP_HOST : OLLAMA_HOST;
}

function getChatUrl(provider) {
  const normalizedProvider = normalizeProvider(provider);
  return normalizedProvider === 'llama.cpp'
    ? `${getProviderHost(normalizedProvider)}/v1/chat/completions`
    : `${getProviderHost(normalizedProvider)}/api/chat`;
}

function getModelsUrl(provider) {
  const normalizedProvider = normalizeProvider(provider);
  return normalizedProvider === 'llama.cpp'
    ? `${getProviderHost(normalizedProvider)}/v1/models`
    : `${getProviderHost(normalizedProvider)}/api/tags`;
}

function buildChatBody({ provider, model, messages, stream = false, json = false, options = {} }) {
  const normalizedProvider = normalizeProvider(provider);
  if (normalizedProvider === 'llama.cpp') {
    return {
      model,
      messages,
      stream,
      temperature: options.temperature,
      top_p: options.top_p,
      n_ctx: options.num_ctx,
      max_tokens: options.num_predict,
      reasoning_format: 'none',
      chat_template_kwargs: { enable_thinking: false },
      cache_prompt: false
    };
  }

  return {
    model,
    messages,
    format: json ? 'json' : undefined,
    think: false,
    stream,
    options,
    keep_alive: options.keep_alive
  };
}

async function requestChat({ provider, model, messages, stream = false, json = false, options = {}, signal }) {
  return fetch(getChatUrl(provider), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildChatBody({ provider, model, messages, stream, json, options })),
    ...(signal ? { signal } : {})
  });
}

function stripReasoningMarkup(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/?think>/gi, '');
}

function getResponseText(data, provider) {
  if (normalizeProvider(provider) === 'llama.cpp') {
    return stripReasoningMarkup(data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '').trim();
  }
  return data?.message?.content || data?.response || '';
}

function getStreamText(data, provider) {
  if (normalizeProvider(provider) === 'llama.cpp') {
    return stripReasoningMarkup(data?.choices?.[0]?.delta?.content || data?.choices?.[0]?.text || '');
  }
  return data?.message?.content || '';
}

function parseStreamPayload(line, provider) {
  const normalizedLine = String(line || '').trim();
  if (!normalizedLine || normalizedLine === '[DONE]') return null;
  const payload = normalizeProvider(provider) === 'llama.cpp'
    ? normalizedLine.replace(/^data:\s*/, '')
    : normalizedLine;
  if (!payload || payload === '[DONE]') return null;
  return JSON.parse(payload);
}

async function listModels(provider) {
  const normalizedProvider = normalizeProvider(provider);
  const response = await fetch(getModelsUrl(normalizedProvider), { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(`${getProviderLabel(normalizedProvider)} returned status ${response.status}`);
  }

  const data = await response.json();
  const models = normalizedProvider === 'llama.cpp'
    ? (data.data || []).map(model => model.id || model.model)
    : (data.models || []).map(model => model.name || model.model);

  return models.filter(Boolean);
}

async function checkProviderStatus(provider = DEFAULT_PROVIDER) {
  const normalizedProvider = normalizeProvider(provider);
  const host = getProviderHost(normalizedProvider);

  try {
    const models = await listModels(normalizedProvider);
    const defaultModel = normalizedProvider === 'llama.cpp' ? (models[0] || DEFAULT_MODEL) : DEFAULT_MODEL;
    const hasTargetModel = models.some(model => model === defaultModel || model.startsWith(`${defaultModel}:`));
    return {
      provider: normalizedProvider,
      providerLabel: getProviderLabel(normalizedProvider),
      connected: true,
      host,
      ollamaHost: normalizedProvider === 'ollama' ? host : undefined,
      defaultModel,
      hasTargetModel,
      models
    };
  } catch (error) {
    return {
      provider: normalizedProvider,
      providerLabel: getProviderLabel(normalizedProvider),
      connected: false,
      host,
      ollamaHost: normalizedProvider === 'ollama' ? host : undefined,
      defaultModel: DEFAULT_MODEL,
      hasTargetModel: false,
      error: error.message || `Cannot reach ${getProviderLabel(normalizedProvider)}`,
      models: []
    };
  }
}

async function resetProviderMemory(provider, model) {
  const normalizedProvider = normalizeProvider(provider);
  if (normalizedProvider === 'llama.cpp') {
    console.log(`[llama.cpp Context] Request cache disabled for model "${model}"; no server conversation reset required.`);
    return;
  }

  try {
    const response = await requestChat({
      provider: normalizedProvider,
      model,
      messages: [],
      stream: false,
      options: { keep_alive: 0 }
    });
    if (response.ok) {
      console.log(`[Ollama Context Reset] Memory reset complete for "${model}".`);
    }
  } catch (error) {
    console.warn(`[Ollama Context Reset Warning] Could not reset memory for "${model}":`, error.message);
  }
}

module.exports = {
  normalizeProvider,
  getProviderLabel,
  getProviderHost,
  requestChat,
  getResponseText,
  getStreamText,
  parseStreamPayload,
  checkProviderStatus,
  resetProviderMemory
};
