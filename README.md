# Digilangues: AI Language-Needs Diagnostic

A local demo where a business client describes their team's language profile, and the tool uses the Mistral API to generate a tailored training programme on the spot: target CEFR level, format, weekly schedule, duration and a pedagogical rationale.

<!-- TODO: screenshot of the form + generated diagnostic -->

## Why

For a B2B language-training provider like Digilangues, the first step with any new client is a needs assessment: understanding the team's sector, size, current level and goal, then proposing a realistic programme. This prototype shows how an LLM can turn that short intake form into a structured, CEFR-aligned first proposal in seconds. A training advisor can then review and refine it, instead of writing it from scratch.

<!-- TODO: add context if relevant (e.g. built for an application / case study for Digilangues) -->

## How it works

- **Frontend** (`static/`): a single page with a form (sector, team size, target language, current CEFR level, goal) that renders the result.
- **Backend** (`main.py`): FastAPI exposes `POST /api/diagnostic`, validates the input, and calls `https://api.mistral.ai/v1/chat/completions` with a system prompt that enforces realistic progression (one sub-level to one full CEFR level) and a strict JSON schema.
- The API key is read server-side with `python-dotenv` and is never exposed to the browser.
- The UI and the generated programme are in French.

## Run locally

### 1. Configure `.env`

```bash
cp .env.example .env
```

Add your Mistral API key (from [console.mistral.ai](https://console.mistral.ai/)):

```
MISTRAL_API_KEY=...
MISTRAL_MODEL=mistral-small-latest
```

### 2. Install dependencies

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
```

### 3. Start the server

```bash
uvicorn main:app --reload
```

### 4. Open the app

Go to [http://localhost:8000](http://localhost:8000), fill in the form and click **Générer le diagnostic**.

## Project structure

```
digilangues-diagnostic-ia/
├── main.py           # FastAPI app + POST /api/diagnostic
├── .env.example      # Environment template
├── requirements.txt
└── static/
    ├── index.html    # Single page (form + result)
    ├── style.css     # Navy / amber design
    └── script.js     # Form logic, API call, CEFR rendering
```

## Stack

Python · FastAPI · Mistral API · vanilla HTML/CSS/JS
