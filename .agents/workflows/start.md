---
description: How to start and run the KAIROS PRO v3.0 trading system (Committee Model)
---
// turbo-all

# Starting KAIROS PRO v3.0

## Quick Start
1. Double-click `d:\KAIROS\start.bat` — opens 3 terminals + browser.

## Manual Start (3 Terminals)

### Terminal 1 — Brain (Monte Carlo Engine)
```
cd d:\KAIROS\brain
venv\Scripts\python.exe -m uvicorn main:app --reload --port 8400 --host 0.0.0.0
```

### Terminal 2 — Hub (Committee Pipeline)
```
cd d:\KAIROS\hub
npx tsx watch src/index.ts
```

### Terminal 3 — Eyes (Vue 3 Command Center)
```
cd d:\KAIROS\client
npm run dev
```

### Open the Command Center
Navigate to `http://localhost:5173`

## API Keys (Optional but Recommended)
Edit `d:\KAIROS\hub\.env`:
```
GEMINI_KEYS_FLASH=your_key_1,your_key_2
GEMINI_KEYS_WATCHER=your_key_3
GEMINI_KEYS_PRO=your_key_4
```
Without keys, the system uses algorithmic fallback analysis.
Get keys from: https://aistudio.google.com/apikey

## Committee Pipeline
1. Select asset from sidebar (5 crypto + 5 forex)
2. Click **🏛️ RUN COMMITTEE**
3. Pipeline runs: Scraper + Journalist (parallel) → Brain MC → Prediction
4. Results display in Intelligence Terminal + Technical Forensics
5. Watcher monitors continuously for emergency events

## Sound Guide
- **Short Pulse**: 15-min update received
- **Alarm Siren**: Watcher emergency (crash, rate change, war)
- **Success Chord**: Prediction >80% conviction
