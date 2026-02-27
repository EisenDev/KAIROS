# KAIROS PRO v3.5 - The Execution Layer

**KAIROS PRO** is a highly advanced Stochastic Trade Orchestrator and quantitative prediction system built on a distinctive "Committee Model." Designed to process multiple streams of data, KAIROS leverages algorithmic fallback analysis alongside generative AI models (Google Gemini) and deep stochastic simulations (Monte Carlo) to evaluate, predict, and trigger trade alerts across crypto and forex markets.

## 🌟 Key Features

The KAIROS Engine operates via an ensemble of sophisticated components:

*   **Scraper + Journalist Pipeline**: Parallelized ingestion and sentiment analysis of market news and conditions.
*   **Watcher Daemon**: Continuously monitors the market for emergency events (e.g., sudden crashes, massive rate changes, macroeconomic events).
*   **Monte Carlo Brain**: A powerful physics-style stochastic engine simulating price pathways using statistical tools (`numpy`, `scipy`, `scikit-learn`).
*   **Pulse Stream**: A 2-second real-time websocket price stream for high-precision awareness.
*   **Candle-Close Sync**: Auto-trigger interval that natively aligns with market close logic.
*   **Bi-directional Signaling**: Demands a minimum 70% confidence threshold before signaling valid trade parameters.
*   **Intelligent Sound Guide**: 
    *   *Short Pulse*: 15-min update successfully received.
    *   *Alarm Siren*: Watcher emergency triggered (crash, rapid shift, etc.).
    *   *Success Chord*: Trade prediction features >80% conviction.

## 🏗️ Architecture

KAIROS consists of three core independent services designed to operate synchronously:

### 1. 🧠 Brain (`/brain`) - The Monte Carlo Engine
*   **Role**: Executes complex mathematical simulations and statistical forecasting.
*   **Stack**: Python 3.x, FastAPI, Uvicorn, Pandas, Numpy, SciPy, Scikit-Learn.
*   **Port**: `8400`

### 2. 🎡 Hub (`/hub`) - Committee Pipeline & Price Pulse
*   **Role**: The central circulatory system of KAIROS. Orchestrates generative AI (Gemini), WebSockets, and data layers. Determines consensus among committee models.
*   **Stack**: Node.js, TypeScript, Hono (Server + WS), `@google/genai`, Postgres, Redis, Supabase.
*   **Port**: `8300`

### 3. 👁️ Eyes (`/client`) - The Command Center
*   **Role**: The user interface. Real-time charts, intelligence terminal, and technical forensics modal. 
*   **Stack**: Vue 3, Vite, TailwindCSS (v4), Lightweight Charts, `@inertiajs/vue3`, TypeScript.
*   **Port**: `5173`

---

## 🚀 Getting Started

KAIROS operates exclusively on Windows as its primary execution environment given current `.bat` configurations, though individual services are cross-platform.

### Quick Start (Windows Only)
Run the master batch launcher at the root directory:
```bash
d:\KAIROS\start.bat
```
This automatically initiates all three terminals safely out of sight, maps the connections, and opens the Command Center in your default browser.

### Manual Initialization (Multi-Terminal)

If you prefer to start the services individually, instantiate three separate terminals:

**Terminal 1 — Brain**
```bash
cd d:\KAIROS\brain
venv\Scripts\python.exe -m uvicorn main:app --reload --port 8400 --host 0.0.0.0
```

**Terminal 2 — Hub**
```bash
cd d:\KAIROS\hub
npm install
npx tsx watch src/index.ts
```

**Terminal 3 — Eyes**
```bash
cd d:\KAIROS\client
npm install
npm run dev
```

Finally, open your browser and navigate to the Eyes Command Center: [http://localhost:5173](http://localhost:5173)

## 🔑 Configuration & API Keys

Rename `d:\KAIROS\hub\.env.example` to `d:\KAIROS\hub\.env` (or create it) and integrate your API Keys. While the system utilizes an algorithmic fallback analysis in the absence of AI keys, bringing the **Committee Model** to its full potential requires keys from [Google AI Studio](https://aistudio.google.com/apikey):

```env
GEMINI_KEYS_FLASH=your_key_1,your_key_2
GEMINI_KEYS_WATCHER=your_key_3
GEMINI_KEYS_PRO=your_key_4
# Include standard DB endpoints as defined in .env.example
```

## 📈 Operation Methodology

1.  Open the **Command Center** UI.
2.  Select your target asset from the provided sidebar options (Configured for 5 Crypto + 5 Forex assets).
3.  Click the **🏛️ RUN COMMITTEE** execution button.
4.  The pipeline commences execution: `Scraper` + `Journalist` (run parallel) ➔ `Brain` ➔ `Prediction Engine`.
5.  Analytical results and verdicts populate the **Intelligence Terminal** and the **Technical Forensics** view.
6.  `Watcher` stays active in the background for continuous security monitoring.

## ⚠️ Disclaimer

KAIROS PRO is an advanced experimental system created for analytical and educational purposes. It attempts predictive stochastic and sentiment orchestration. **It does not constitute financial advice. Use strict discretion in live trading applications.**
