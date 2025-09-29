console.log("Loaded popup javascript file!")

document.getElementById('open-options').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('manual-scan').addEventListener('click', async () => {
  console.log('Manual scan button clicked');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab) return;

  console.log('Executing script in tab', tab.id);

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      console.log('mcq_manual_scan event dispatched');
      window.dispatchEvent(new CustomEvent('mcq_manual_scan'));
    }
  });
});

const mcqContainer = document.getElementById('mcqContainer');
const status = document.getElementById('status');
let scanInProgress = false;

function setStatus(text, color) {
  status.innerText = text;
  status.style.color = color || '';
}

// Listen for answers sent from background via content script (which forwards)
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'mcq_answer') {
    scanInProgress = false;
    mcqContainer.innerHTML = '';
    const { mcq, answer, error } = message;
    const el = document.createElement('div');
    el.className = 'mcq-block';
    if (error) {
      el.innerHTML = `<strong>Q:</strong> ${mcq?.question || ''}<br><span class="error">Error</span><pre>${error}</pre>`;
      setStatus(error, '#e74c3c');
    } else {
      el.innerHTML = `<strong>Q:</strong> ${mcq.question}<br><span class="answer">${answer.short || answer.text || '—'}</span><pre>${answer.text || ''}</pre>`;
      setStatus('Scan complete', '#1aaf5d');
    }
    mcqContainer.prepend(el);
  }
});

// update UI with settings summary
async function loadSettingsSummary() {
  const s = await new Promise(resolve => chrome.storage.local.get({
    mode: 'remote', remote_api_url: '', local_server_url: ''
  }, res => resolve(res)));
  setStatus(`Mode: ${s.mode} · Remote: ${s.remote_api_url ? 'set' : 'not set'}`, '#4f8cff');
}
loadSettingsSummary();

// Manual scan button
const manualScanBtn = document.getElementById('manual-scan');
manualScanBtn.addEventListener('click', async () => {
  if (scanInProgress) return;
  scanInProgress = true;
  setStatus('Scanning...', '#4f8cff');
  mcqContainer.innerHTML = '';
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    setStatus('No active tab', '#e74c3c');
    scanInProgress = false;
    return;
  }
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      window.dispatchEvent(new CustomEvent('mcq_manual_scan'));
    }
  });
});

// Options button
const openOptionsBtn = document.getElementById('open-options');
openOptionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});
