// options.js
const modeEl = document.getElementById('mode');
const remoteApiEl = document.getElementById('remote_api_url');
const remoteKeyEl = document.getElementById('remote_api_key');
const localUrlEl = document.getElementById('local_server_url');
const modelEl = document.getElementById('model');
const statusEl = document.getElementById('status');

function showStatus(msg, ok=true) {
  statusEl.innerText = msg;
  statusEl.style.color = ok ? 'green' : 'red';
  setTimeout(() => statusEl.innerText = '', 3000);
}

document.getElementById('save').addEventListener('click', () => {
  const settings = {
    mode: modeEl.value,
    remote_api_url: remoteApiEl.value.trim(),
    remote_api_key: remoteKeyEl.value.trim(),
    local_server_url: localUrlEl.value.trim(),
    model: modelEl.value.trim() || 'gpt-4o-mini'
  };
  chrome.storage.local.set(settings, () => showStatus('Saved'));
});

document.getElementById('clear-cache').addEventListener('click', () => {
  chrome.storage.local.remove(['cache_v2'], () => showStatus('Cache cleared'));

});

function load() {
  chrome.storage.local.get({
    mode: 'remote',
    remote_api_url: '',
    remote_api_key: '',
    local_server_url: '',
    model: 'gpt-4o-mini'
  }, (items) => {
    modeEl.value = items.mode;
    remoteApiEl.value = items.remote_api_url || '';
    remoteKeyEl.value = items.remote_api_key || '';
    localUrlEl.value = items.local_server_url || '';
    modelEl.value = items.model || 'gpt-4o-mini';
  });
}
load();
