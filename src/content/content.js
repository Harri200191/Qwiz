// content.js
// Runs in the page context. Detects MCQs heuristically and notifies background.

const DEBOUNCE_MS = 400;
let lastDetectedHash = null;
let debounceTimer = null;

console.log('MCQ content script loaded');

// Utility: compute a simple hash for question text to de-duplicate
function simpleHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

// Try to extract MCQs from DOM using multiple heuristics.
function findMCQsInDOM() {
  const results = [];

  // 1) Radio groups: preferred (structured)
  const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
  const grouped = {};

  console.log('Found radio inputs:', radios.length);

  radios.forEach(r => {
    if (!r.name) return;
    if (!r.checked && r.offsetParent === null && r.getBoundingClientRect().width === 0) {
      // invisible -> skip
    }
    if (!grouped[r.name]) grouped[r.name] = [];
    // find label text
    let labelText = '';
    const id = r.id;
    if (id) {
      const lab = document.querySelector(`label[for="${id}"]`);
      if (lab) labelText = lab.innerText.trim();
    }
    if (!labelText) {
      // try parent label
      const parentLabel = r.closest('label');
      if (parentLabel) labelText = parentLabel.innerText.trim();
    }
    if (!labelText) {
      // fallback: sibling text
      const sibling = r.nextSibling;
      if (sibling && sibling.nodeType === Node.TEXT_NODE) labelText = sibling.textContent.trim();
    }
    grouped[r.name].push({ input: r, text: labelText || '' });
  });

  Object.keys(grouped).forEach(key => {
    const opts = grouped[key];
    if (opts.length >= 2 && opts.length <= 8) {
      // Try to locate a question container as ancestor
      let container = opts[0].input.closest('form, fieldset, article, .question, .quiz, .q-block') || document.body;
      // Find question text as nearest preceding header/paragraph
      let question = '';
      const headings = ['h1','h2','h3','h4','h5','h6','p','span','div','label'];
      for (let el = opts[0].input.parentElement; el; el = el.parentElement) {
        // search siblings above
        let prev = el.previousElementSibling;
        while (prev) {
          const t = prev.innerText && prev.innerText.trim();
          if (t && t.length > 5 && t.split(/\s+/).length < 60) { question = t; break; }
          prev = prev.previousElementSibling;
        }
        if (question) break;
      }
      // fallback: whole container text trimmed
      if (!question) question = container.innerText.split('\n').map(s => s.trim()).find(s => /\S/);

      results.push({
        source: 'radio',
        question: question ? question.trim() : '',
        options: opts.map(o => o.text || o.input.value || '').map(s => s.trim()).filter(Boolean),
        container
      });
    }
  });

  // 2) Lists / lettered lines heuristics: look for lines starting with A) B) etc or 1. 2. for question
  const visibleText = document.body.innerText || '';
  const lines = visibleText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length < 500);
  for (let i = 0; i < lines.length; i++) {
    // question patterns: "Q4." "4." or "Question 4" or lines that end with "?"
    if (/^(?:Q(?:uestion)?\s*\d+[:.\-]?\s*)|^\d+\.\s+/.test(lines[i]) || lines[i].endsWith('?')) {
      // gather next 2-6 lines as options if they start with A), B), A., (A) or letters
      const opts = [];
      for (let j = i+1; j <= i+6 && j < lines.length; j++) {
        if (/^[A-D]\)|^[A-D]\.|^\([A-D]\)|^[A-D]\s-/.test(lines[j]) || /^[A-D]\s/.test(lines[j])) {
          // remove leading letter markers
          opts.push(lines[j].replace(/^[A-D][\)\.\-]?\s*/i, '').trim());
        } else {
          // if the next line looks like plain option (short length) also consider
          if (lines[j].split(/\s+/).length <= 10 && opts.length > 0) {
            opts.push(lines[j]);
          } else break;
        }
      }
      if (opts.length >= 2 && opts.length <= 6) {
        const q = lines[i].replace(/^\d+\.\s*/, '').replace(/^Question\s*\d+\s*[:.\-]?\s*/i, '').trim();
        results.push({ source: 'text-lines', question: q, options: opts, container: null });
      }
    }
  }

  // Normalize unique by hashing question+options
  const normalized = [];
  const seen = new Set();
  results.forEach(r => {
    const key = simpleHash((r.question || '') + '|' + (r.options || []).join('|'));
    if (!seen.has(key) && (r.question && r.question.length > 3) && r.options && r.options.length >= 2) {
      seen.add(key);
      normalized.push({ id: key, question: r.question, options: r.options, source: r.source, container: r.container });
    }
  });

  return normalized;
}

function showOverlayForAnswer(mcq, answerText) {
  // Create a lightweight overlay anchored to the question container (if provided)
  try {
    // Remove existing overlay for same id
    const existing = document.querySelector(`#mcq-overlay-${mcq.id}`);
    if (existing) existing.remove();

    const container = mcq.container || document.body;
    const overlay = document.createElement('div');
    overlay.id = `mcq-overlay-${mcq.id}`;
    overlay.style.position = 'absolute';
    overlay.style.zIndex = 2147483647;
    overlay.style.background = 'rgba(255,255,255,0.95)';
    overlay.style.border = '1px solid rgba(0,0,0,0.12)';
    overlay.style.padding = '8px 10px';
    overlay.style.borderRadius = '8px';
    overlay.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    overlay.style.maxWidth = '320px';
    overlay.style.fontSize = '13px';
    overlay.style.color = '#111';
    overlay.innerText = `Answer suggestion: ${answerText}`;

    // Calculate position near container
    let rect = { top: 100, left: 20 };
    try {
      const el = mcq.container instanceof Element ? mcq.container : document.body;
      rect = el.getBoundingClientRect();
    } catch (e) {}

    overlay.style.top = `${window.scrollY + Math.max(0, rect.top - 10)}px`;
    overlay.style.left = `${Math.max(10, rect.left + window.scrollX)}px`;

    // Close button
    const btn = document.createElement('button');
    btn.innerText = 'x';
    btn.style.float = 'right';
    btn.style.marginLeft = '8px';
    btn.style.border = 'none';
    btn.style.background = 'transparent';
    btn.style.cursor = 'pointer';
    btn.onclick = () => overlay.remove();
    overlay.prepend(btn);

    document.body.appendChild(overlay);
  } catch (e) { console.warn('overlay failed', e); }
}

// Send MCQ to background to get an answer
function sendMCQToBackground(mcq) {
  chrome.runtime.sendMessage({ type: 'mcq_detected', mcq }, (resp) => {
    // background will send a follow-up message with answer via chrome.tabs.sendMessage
    // Alternatively, the callback receives a direct response if implemented.
    // We'll rely on chrome.runtime.onMessage below.
  });
}

// Listen for answers from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'mcq_answer') {
    const { mcq, answer } = message;
    showOverlayForAnswer(mcq, answer?.short || answer?.text || 'No answer');
  }
});

// Main loop: detect MCQs and send new ones
function runDetectionCycle() {
  const mcqs = findMCQsInDOM();

  console.log('Detected MCQs:', mcqs);

  if (!mcqs || mcqs.length === 0) return;
  // send newest one(s)
  mcqs.forEach(mcq => {
    if (mcq.id === lastDetectedHash) return;
    lastDetectedHash = mcq.id;
    sendMCQToBackground(mcq);
  });
}

// MutationObserver to watch for dynamic quiz content (SPA)
const observer = new MutationObserver(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => runDetectionCycle(), DEBOUNCE_MS);
});

observer.observe(document.body, { childList: true, subtree: true, attributes: false });

// initial run
setTimeout(() => runDetectionCycle(), 800);

window.addEventListener('mcq_manual_scan', () => {
  console.log("Manual scan event received");
  runDetectionCycle();
});