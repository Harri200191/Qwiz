# Qwiz &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <img src="icons/icon-128.png" alt="Our Logo" width="70" height="70"/> 


A Chrome extension that detects Multiple Choice Questions (MCQs) on any webpage and suggests answers using a configurable LLM (OpenAI or local server).

---

## Features
- Detects MCQs on most web pages automatically
- Suggests answers using OpenAI API or your own local LLM server
- Beautiful popup UI with manual scan and error reporting
- Options page for configuring API keys, endpoints, and model
- Overlay answer suggestions directly on the page

---

## Installation & Usage

### 1. Load the Extension
1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder (containing `manifest.json`).

### 2. Configure API Keys and Model
1. Click the extension icon, then click **Options**.
2. Set the following:
   - **Mode**: `remote` (OpenAI) or `local` (your server)
   - **Remote API URL**: e.g. `https://api.openai.com/v1/chat/completions`
   - **Remote API Key**: your OpenAI API key (starts with `sk-...`)
   - **Local Server URL**: e.g. `http://localhost:5000/generate` (if using a local model)
   - **Model Name**: e.g. `gpt-4o-mini` or your preferred model
3. Save your settings.

### 3. Using the Extension
- MCQs are detected automatically on most pages.
- Click the extension icon to open the popup.
- Click **Manual Scan** to force a scan if needed.
- Answers will appear in the popup and as overlays on the page.

### 4. Error Handling
- If there is a configuration or network error, the popup will show an error in red.
- Make sure your API key and endpoint are correct.

### 5. Automated Testing
- Run Playwright tests with:
  ```sh
  npx playwright test tests/playwright/test-extension.spec.js
  ```

---

## Development
- Main logic: `src/content/content.js` (detection), `src/background/service-worker.js` (API calls), `src/popup/popup.js` (UI)
- Options page: `src/options/options.html` and `options.js`
- Popup UI: `src/popup/popup.html`, `popup.js`, `popup.css`
- Native host (optional): `native-host/`

---

## Troubleshooting
- **No answers or stuck on Scanning...**: Check your API key, endpoint, and open the service worker console for errors.
- **No overlays on page**: Make sure content script is running (check page console for logs).
- **Still stuck?**: Reload the extension, check permissions, and try again.

---

## License
MIT

