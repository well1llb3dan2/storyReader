const STORAGE_KEY = "storyreader_ai_settings";

export const AI_STEPS = [
  { key: "outline", label: "Narrative Architect" },
  { key: "characters", label: "Character Designer" },
  { key: "storyboard", label: "Storyboard Creator" },
  { key: "chapter", label: "Novelist Chapter" }
];

const DEFAULT_MODEL = "hf.co/DavidAU/Gemma-The-Writer-Mighty-Sword-9B-GGUF:Q6_K";
const DEFAULT_PROVIDER = "ollama";

export const DEFAULT_AI_SETTINGS = {
  provider: DEFAULT_PROVIDER,
  models: {
    outline: DEFAULT_MODEL,
    characters: DEFAULT_MODEL,
    storyboard: DEFAULT_MODEL,
    chapter: DEFAULT_MODEL
  },
  context: {
    outline: 16384,
    characters: 16384,
    storyboard: 16384,
    chapter: 8192
  },
  temperature: {
    outline: 0.75,
    characters: 0.72,
    storyboard: 0.2,
    chapter: 0.78
  },
  topP: {
    outline: 0.9,
    characters: 0.9,
    storyboard: 0.9,
    chapter: 0.9
  },
  numPredict: {
    outline: 8192,
    characters: 8192,
    storyboard: 4096,
    chapter: 6500
  }
};

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_AI_SETTINGS));
}

function readStoredSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!stored) return cloneDefaults();
    return {
      provider: stored.provider === "llama.cpp" ? "llama.cpp" : DEFAULT_PROVIDER,
      models: { ...DEFAULT_AI_SETTINGS.models, ...(stored.models || {}) },
      context: { ...DEFAULT_AI_SETTINGS.context, ...(stored.context || {}) },
      temperature: { ...DEFAULT_AI_SETTINGS.temperature, ...(stored.temperature || {}) },
      topP: { ...DEFAULT_AI_SETTINGS.topP, ...(stored.topP || {}) },
      numPredict: { ...DEFAULT_AI_SETTINGS.numPredict, ...(stored.numPredict || {}) }
    };
  } catch {
    return cloneDefaults();
  }
}

export const aiSettings = readStoredSettings();

export function saveAISettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(aiSettings));
}

export function getStepAISettings(step) {
  const temperature = Number(aiSettings.temperature[step]);
  const topP = Number(aiSettings.topP[step]);
  return {
    provider: aiSettings.provider,
    model: aiSettings.models[step] || DEFAULT_MODEL,
    contextSize: Number(aiSettings.context[step]) || DEFAULT_AI_SETTINGS.context[step],
    temperature: Number.isFinite(temperature) ? temperature : DEFAULT_AI_SETTINGS.temperature[step],
    topP: Number.isFinite(topP) ? topP : DEFAULT_AI_SETTINGS.topP[step],
    numPredict: Number(aiSettings.numPredict[step]) || DEFAULT_AI_SETTINGS.numPredict[step]
  };
}

export function getAIProvider() {
  return aiSettings.provider;
}

export function applyAvailableModels(models, defaultModel = DEFAULT_MODEL) {
  const availableModels = [...new Set((models || []).filter(model => typeof model === "string" && model.trim()))];
  if (!availableModels.length) return;

  AI_STEPS.forEach(({ key }) => {
    if (!availableModels.includes(aiSettings.models[key])) {
      aiSettings.models[key] = availableModels.includes(defaultModel) ? defaultModel : availableModels[0];
    }
  });
  saveAISettings();

  document.querySelectorAll("[data-ai-model]").forEach(select => {
    const step = select.dataset.aiModel;
    const selected = aiSettings.models[step];
    select.replaceChildren(...availableModels.map(model => {
      const option = document.createElement("option");
      option.value = model;
      option.textContent = model;
      return option;
    }));
    select.value = selected;
  });
}

function renderSettingsPanel(panel) {
  const type = panel.dataset.settingsPanel;
  const settingGroup = type === "models" ? aiSettings.models : type === "context" ? aiSettings.context : type === "num-predict" ? aiSettings.numPredict : aiSettings.temperature;
  const rows = AI_STEPS.map(({ key, label }) => {
    if (type === "models") {
      return `<label class="settings-row"><span><strong>${label}</strong><small>Model used for this generation step</small></span><select data-ai-model="${key}"></select></label>`;
    }
    if (type === "context") {
      return `<label class="settings-row"><span><strong>${label}</strong><small>Maximum context window sent to the selected local provider</small></span><select data-ai-context="${key}">${[8192, 16384, 24576, 32768].map(value => `<option value="${value}" ${Number(settingGroup[key]) === value ? "selected" : ""}>${value.toLocaleString()} tokens</option>`).join("")}</select></label>`;
    }
    if (type === "num-predict") {
      return `<label class="settings-row"><span><strong>${label}</strong><small>Maximum tokens the model may generate</small></span><select data-ai-num-predict="${key}">${[2048, 4096, 6500, 8192, 12288, 16384, 24576, 32768].map(value => `<option value="${value}" ${Number(settingGroup[key]) === value ? "selected" : ""}>${value.toLocaleString()} tokens</option>`).join("")}</select></label>`;
    }
    return `<label class="settings-row"><span><strong>${label}</strong><small>Creativity and nucleus sampling for this step</small></span><span class="temperature-control"><span class="range-label">Temperature</span><input type="range" min="0" max="1.2" step="0.01" value="${aiSettings.temperature[key]}" data-ai-temperature="${key}"><output data-temperature-output="${key}">${Number(aiSettings.temperature[key]).toFixed(2)}</output><span class="range-label">Top P</span><input type="range" min="0" max="1" step="0.01" value="${aiSettings.topP[key]}" data-ai-top-p="${key}"><output data-top-p-output="${key}">${Number(aiSettings.topP[key]).toFixed(2)}</output></span></label>`;
  }).join("");
  const providerRow = type === "models" ? `<div class="settings-provider-row">
    <span><strong>AI Provider</strong><small>Choose the local inference server used by every generation stage</small></span>
    <div class="provider-toggle" role="group" aria-label="AI provider">
      <button type="button" class="provider-toggle-button ${aiSettings.provider === "ollama" ? "active" : ""}" data-ai-provider-choice="ollama">Ollama</button>
      <button type="button" class="provider-toggle-button ${aiSettings.provider === "llama.cpp" ? "active" : ""}" data-ai-provider-choice="llama.cpp">llama.cpp</button>
    </div>
  </div>` : "";
  panel.innerHTML = `${providerRow}<div class="settings-list">${rows}</div>`;
}

export function setupAISettings({ onNavigateHome, onProviderChange } = {}) {
  document.querySelectorAll("[data-settings-panel]").forEach(renderSettingsPanel);
  applyAvailableModels([], DEFAULT_MODEL);

  document.querySelectorAll("[data-settings-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
      const selected = tab.dataset.settingsTab;
      document.querySelectorAll("[data-settings-tab]").forEach(item => item.classList.toggle("active", item === tab));
      document.querySelectorAll("[data-settings-panel]").forEach(panel => panel.classList.toggle("active", panel.dataset.settingsPanel === selected));
    });
  });

  document.addEventListener("change", event => {
    const target = event.target;
    if (target.matches("[data-ai-model]")) {
      aiSettings.models[target.dataset.aiModel] = target.value;
      saveAISettings();
    }
    if (target.matches("[data-ai-context]")) {
      aiSettings.context[target.dataset.aiContext] = Number(target.value);
      saveAISettings();
    }
    if (target.matches("[data-ai-num-predict]")) {
      aiSettings.numPredict[target.dataset.aiNumPredict] = Number(target.value);
      saveAISettings();
    }
  });

  document.addEventListener("click", event => {
    const target = event.target.closest("[data-ai-provider-choice]");
    if (!target) return;
    aiSettings.provider = target.dataset.aiProviderChoice === "llama.cpp" ? "llama.cpp" : DEFAULT_PROVIDER;
    document.querySelectorAll("[data-ai-provider-choice]").forEach(button => {
      button.classList.toggle("active", button.dataset.aiProviderChoice === aiSettings.provider);
    });
    saveAISettings();
    if (typeof onProviderChange === "function") onProviderChange(aiSettings.provider);
  });

  document.addEventListener("input", event => {
    const target = event.target;
    if (target.matches("[data-ai-temperature]")) {
      aiSettings.temperature[target.dataset.aiTemperature] = Number(target.value);
      const output = document.querySelector(`[data-temperature-output="${target.dataset.aiTemperature}"]`);
      if (output) output.value = Number(target.value).toFixed(2);
      saveAISettings();
    }
    if (target.matches("[data-ai-top-p]")) {
      aiSettings.topP[target.dataset.aiTopP] = Number(target.value);
      const output = document.querySelector(`[data-top-p-output="${target.dataset.aiTopP}"]`);
      if (output) output.value = Number(target.value).toFixed(2);
      saveAISettings();
    }
  });

  const homeButton = document.getElementById("btnCloseSettings");
  if (homeButton && typeof onNavigateHome === "function") homeButton.addEventListener("click", onNavigateHome);
}
