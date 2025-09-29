// popup.js
document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
document.getElementById('manual-scan').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      // trigger a run of detection (content script has run)
      // we can dispatch a custom event that content.js listens to if needed.
      window.dispatchEvent(new CustomEvent('mcq_manual_scan'));
    }
  });
});

const mcqContainer = document.getElementById('mcqContainer');
const status = document.getElementById('status');

// Listen for answers sent from background via content script (which forwards)
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'mcq_answer') {
    const { mcq, answer } = message;
    const el = document.createElement('div');
    el.className = 'mcq-block';
    el.innerHTML = `<strong>Q:</strong> ${mcq.question}<br><strong>Suggested:</strong> ${answer.short || answer.text || '—'}<pre>${answer.text || ''}</pre>`;
    mcqContainer.prepend(el);
    status.innerText = 'Received suggestion';
  }
});

// update UI with settings summary
async function loadSettingsSummary() {
  const s = await new Promise(resolve => chrome.storage.local.get({
    mode: 'remote', remote_api_url: '', local_server_url: ''
  }, res => resolve(res)));
  status.innerText = `Mode: ${s.mode} · Remote: ${s.remote_api_url ? 'set' : 'not set'}`;
}
loadSettingsSummary();
