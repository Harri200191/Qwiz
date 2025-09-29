# Qwiz
A Tool that uses LLM local and API calls to give mcq answers on web pages in real time through a browser extension to get rapid, instant reponses


mcq-extension/
├─ README.md # this guide (you are reading it)
├─ manifest.json
├─ icons/
│ └─ icon-128.png
├─ src/
│ ├─ content/
│ │ └─ content.js # DOM scanning, MutationObserver, detection logic
│ ├─ background/
│ │ └─ service_worker.js # background service worker (MV3)
│ ├─ popup/
│ │ ├─ popup.html
│ │ └─ popup.js
│ ├─ options/
│ │ ├─ options.html # store API key, local server URL, preferences
│ │ └─ options.js
│ └─ ui/
│ └─ overlay.css
├─ native-host/ # optional: native messaging host example
│ ├─ com.mycompany.mcqhost.json # native host manifest (OS-specific install)
│ └─ host.py # example Python host (reads JSON from stdin/stdout)
└─ tests/
├─ playwright/ # Playwright testing config and tests
└─ puppeteer/