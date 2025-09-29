// service_worker.js
// MV3 background service worker. Receives MCQs from content, queries the configured model endpoint,
// caches results in chrome.storage.local, and forwards the answer back to the tab.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Helper: get settings (server URL, api mode)
async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get({
      mode: 'remote', // 'remote' or 'local'
      remote_api_url: 'https://api.openai.com/v1/chat/completions',
      remote_api_key: '',
      local_server_url: 'http://localhost:5000/generate',
      model: 'gpt-4o-mini' // suggested default (users pick)
    }, (items) => resolve(items));
  });
}

// Cache helpers
async function readCache(key) {
  return new Promise(resolve => {
    chrome.storage.local.get(['cache_v2'], (res) => {
      const cache = res.cache_v2 || {};
      if (cache[key] && (Date.now() - cache[key].ts) < CACHE_TTL_MS) {
        resolve(cache[key].value);
      } else resolve(null);
    });
  });
}
async function writeCache(key, value) {
  return new Promise(resolve => {
    chrome.storage.local.get(['cache_v2'], (res) => {
      const cache = res.cache_v2 || {};
      cache[key] = { ts: Date.now(), value };
      chrome.storage.local.set({ cache_v2: cache }, () => resolve());
    });
  });
}

// Query the configured model endpoint
async function queryModel(mcq) {
  const settings = await getSettings();

  // Build a prompt that's compact and instructive
  const prompt = [
    `You are an assistant specialized in answering multiple-choice questions.`,
    `Question: ${mcq.question}`,
    `Options:`,
    ...mcq.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`),
    `Task: Select the best answer (single letter) and a short explanation (one sentence).`,
    `Format: {"choice":"<LETTER>","explanation":"<one sentence>","text":"<full answer text>"}` // json parseable
  ].join('\n');

  try {
    if (settings.mode === 'local') {
      // Local server mode: expects a POST { prompt } response JSON { text: "..."}
      const url = settings.local_server_url;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, model: settings.model })
      });
      const data = await response.json();
      // Assume a textual result
      return parseModelText(data.text || data.output || JSON.stringify(data));
    } else {
      // Remote mode (OpenAI-like). Use settings.remote_api_url and settings.remote_api_key
      const apiKey = settings.remote_api_key;
      if (!apiKey) {
        return { choice: null, text: 'No API key configured (open options to set it).' };
      }
      // POST in OpenAI chat completion style
      const res = await fetch(settings.remote_api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: settings.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150,
          temperature: 0
        })
      });
      const json = await res.json();
      // extract text
      let text = '';
      if (json.choices && json.choices[0]) {
        if (json.choices[0].message) text = json.choices[0].message.content;
        else if (json.choices[0].text) text = json.choices[0].text;
      } else if (json.output) text = json.output;
      return parseModelText(text || JSON.stringify(json));
    }
  } catch (err) {
    console.error('model query failed', err);
    return { choice: null, text: `Error querying model: ${err.message || err}` };
  }
}

// Try to parse the model's text into expected JSON; fallback to heuristics
function parseModelText(text) {
  if (!text) return { choice: null, text: '' };
  // Attempt JSON parse first
  try {
    const j = JSON.parse(text.trim());
    if (j.choice || j.text) return { choice: j.choice || null, text: j.text || (j.choice && j.explanation ? `${j.choice} - ${j.explanation}` : JSON.stringify(j)) , short: j.choice || '' };
  } catch (e) {
    // Not strict JSON; try to find a letter like "A" or "B" at start
  }
  // Heuristic: first letter A/B/C/D in text
  const m = text.match(/\b([A-D])\b/i);
  const letter = m ? m[1].toUpperCase() : null;
  return { choice: letter, text: text.trim(), short: letter || null };
}

// Listen for content script messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'mcq_detected') {
    (async () => {
      const mcq = message.mcq;
      const cacheKey = `${mcq.id}`;
      const cached = await readCache(cacheKey);
      if (cached) {
        // send cached to the originating tab
        if (sender?.tab?.id) {
          chrome.tabs.sendMessage(sender.tab.id, { type: 'mcq_answer', mcq, answer: cached });
        }
        sendResponse({ status: 'cached' });
        return;
      }
      // Query model
      const answer = await queryModel(mcq);
      // store in cache
      await writeCache(cacheKey, answer);
      // reply to tab
      if (sender?.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'mcq_answer', mcq, answer });
      }
      sendResponse({ status: 'ok' });
    })();
    // indicate async response
    return true;
  }
});
