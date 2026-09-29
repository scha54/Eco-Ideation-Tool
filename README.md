# Eco-Ideation Tool

A pair of interactive design tools for water-footprint eco-ideation, grounded in the methodology of **Bocken et al. (2011)** *"Development of an eco-ideation tool to identify more sustainable product design opportunities"*.

---

## Repository overview

```
Eco-Ideation Tool/
├── eco-ideation-tool.html          # Standalone slider dashboard (open in any browser)
├── docs/
│   ├── Bockenetal2011_Developmentofan eco-ideationtool.pdf   # Source paper
│   ├── Water_Use_Eco_Ideation_Sliders.docx                   # Research article (Word)
│   ├── Biodiversity_Eco_Ideation_Tool_Medium_Article.docx    # Biodiversity impact article
│   └── Waste_Eco_Ideation_Tool_Medium_Article.docx           # Waste impact article
└── chatbot/
    ├── server.js                   # Express backend — AI + scripted facilitator
    ├── package.json
    ├── .env                        # Set GEMINI_API_KEY here
    ├── .env.example                # Template with instructions
    ├── sessions/                   # Auto-created; one JSON file per session
    └── public/
        └── index.html              # Full chat UI (single self-contained file)
```

---

## Tool 1 — Slider Dashboard (`eco-ideation-tool.html`)

A zero-dependency single-file web app. Open it directly in any browser — no server, no install.

**What it does:**

- Presents all **14 water-footprint sliders** from Fig. 3 of Bocken et al., adapted for water as the environmental impact dimension.
- Each slider card shows:
  - A leading question (the Bocken "ideation prompt")
  - A colour-graduated Best / Medium / Worst scale
  - A draggable score slider (0–100)
  - Real-time score display
- Two sections mirror the paper's structure:
  - **Section A — Product Design** (sliders 1–7)
  - **Section B — Processing & Value Chain** (sliders 8–14)
- A summary bar at the bottom aggregates all scores.

**How to use:**

1. Open `eco-ideation-tool.html` in Chrome, Edge, or Firefox.
2. Read each leading question and drag the slider to reflect your product's current position.
3. Use the score as a conversation anchor in a design workshop — the lower the score, the bigger the improvement opportunity.

---

## Tool 2 — Conversational Chatbot (`chatbot/`)

A Node.js web application that walks a designer through the same 14 sliders one at a time, acting as an AI-powered (or scripted) eco-design facilitator — directly implementing the human facilitator role described in **Section 3.4** of Bocken et al.

### Features

| | AI mode | Scripted mode |
|---|---|---|
| Requirement | Free Gemini API key | None |
| Intro per slider | Gemini writes a contextual opening | Leading question verbatim |
| Follow-up probes | Dynamic, responds to the user's actual answers | 5 pre-written Socratic questions per slider (70 total) |
| Wrap-up | Gemini offers to advance after 3–4 exchanges | "Next slider" button activates after 3 exchanges |

**UI layout:**

- **Landing view** — enter your product name to start a session
- **Chat view** — 280 px sidebar (progress tracker, live ideas list) + main chat area
  - Slider header with section badge and progress counter (e.g. "3 / 14")
  - Best / Medium / Worst context bar beneath the header
  - Bubble chat: bot responses (left, green) and user responses (right, dark)
  - "Log idea" button → modal to capture a specific improvement idea
  - "Score this slider" button → 0–100 score slider, saved to session
  - "Next slider →" button (activates once enough dialogue has happened)
- **Report view** — session summary with colour-coded score bars per slider, all logged ideas, and a JSON export button

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later (tested on v24)
- A free Gemini API key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey) *(optional — scripted mode works without one)*

### Installation

```bash
cd chatbot
npm install
```

### Configuration

Copy `.env.example` to `.env` and optionally add your Gemini key:

```env
# Leave blank to run in scripted mode (works offline, no key needed)
GEMINI_API_KEY=your_key_here

PORT=3000
```

### Running the server

```bash
cd chatbot
node server.js
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

You will see in the terminal either:

```
✓ Gemini 1.5 Flash connected — AI mode active
```

or:

```
ℹ  No GEMINI_API_KEY — running in scripted mode
```

### API reference

All routes are prefixed `/api/`.

| Method | Path | Body | Response | Purpose |
|--------|------|------|----------|---------|
| `GET` | `/api/mode` | — | `{ ai: bool }` | Query which mode is active |
| `POST` | `/api/session/new` | `{ productName }` | `{ sessionId, totalSliders }` | Start a session |
| `GET` | `/api/session/:id` | — | Full session JSON | Load existing session |
| `POST` | `/api/intro` | `{ sessionId }` | `{ text }` | Bot's opening for current slider |
| `POST` | `/api/chat` | `{ sessionId, message }` | `{ text, canAdvance }` | Send a user message, get bot reply |
| `POST` | `/api/idea` | `{ sessionId, text }` | `{ ok }` | Log an idea to current slider |
| `POST` | `/api/score` | `{ sessionId, score }` | `{ ok }` | Save score for current slider |
| `POST` | `/api/next` | `{ sessionId }` | `{ done, currentSlider }` | Advance to next slider |
| `GET` | `/api/export/:id` | — | Full session JSON | Export complete session |

### Session data format

Sessions are persisted to `chatbot/sessions/<sessionId>.json`:

```json
{
  "id": "abc123",
  "productName": "Cotton T-shirt",
  "currentSlider": 3,
  "sliders": [
    {
      "id": 1,
      "title": "Material Origin",
      "section": "Product Design",
      "score": 72,
      "rating": null,
      "probeIndex": 4,
      "ideas": ["Switch from cotton to Tencel for the main body fabric"],
      "messages": [
        { "role": "bot", "text": "..." },
        { "role": "user", "text": "..." }
      ]
    }
  ]
}
```

---

## The 14 Water-Footprint Sliders

Based on Bocken et al. (2011), Fig. 3, adapted for water as the environmental impact dimension. Research-backed by 21+ open-access papers including Hoekstra & Mekonnen (2012) on global water footprints and Dalin et al. (2012) on virtual water trade.

### Section A — Product Design

| # | Title | Leading question (abbreviated) |
|---|-------|-------------------------------|
| 1 | Material Origin | Animal, plant, or synthetic? Animal inputs carry up to 20× the water footprint per calorie. |
| 2 | Crop / Material Water Intensity | How water-intensive is the dominant crop? Irrigated or rainfed, and in which basin? |
| 3 | Sourcing Basin Water Stress | Are raw materials sourced from water-stressed regions or local water-abundant areas? |
| 4 | Product Concentration | Is the product concentrated, or does it carry unnecessary dilute water to market? |
| 5 | Durability and Service Life | How long is the product in use? Longer life amortises the embedded water footprint. |
| 6 | Recycled Content and Recyclability | Does recycled content reduce demand for virgin water-intensive materials? |
| 7 | Food and Material Waste by Design | How much of the water-intensive product is wasted before consumption? |

### Section B — Processing & Value Chain

| # | Title | Leading question (abbreviated) |
|---|-------|-------------------------------|
| 8 | Wet Processing Intensity | How many dyeing, washing, bleaching steps? Is process water recirculated? |
| 9 | Industrial Cooling Water Demand | How much cooling water is required, and is it in a closed loop? |
| 10 | Supply Chain Loss Rate | What fraction of water-intensive raw material is lost between harvest and finished product? |
| 11 | Virtual Water Trade Distance | How far does embedded water travel through the supply chain? |
| 12 | Consumer Use Water | How much water does the consumer use during the product's active life? |
| 13 | Cold Chain and Freshness Preservation | Does the supply chain rely on water-intensive refrigeration or hydrocooling? |
| 14 | End-of-Life Water Recovery | Does recycling or composting recover the embedded water investment? |

---

## Facilitation methodology

Both tools implement the Bocken et al. Section 3.4 facilitator protocol:

1. **Introduce** the environmental impact dimension (water footprint) and why it matters.
2. **Score the baseline** — where does the product sit on each slider today?
3. **Probe with Socratic questions** — challenge assumptions, surface specific improvement ideas.
4. **Connect to lifecycle** — map ideas back to the six water-use hotspot stages.
5. **Log ideas** — capture concrete, actionable proposals as they emerge.
6. **Synthesise** — identify the highest-leverage sliders and cluster ideas by theme.

The chatbot additionally tracks `canAdvance` state, activating the "Next slider" button only after at least 3 substantive exchanges, preventing superficial treatment of each dimension.

---

## Research basis

The slider set was designed using literature retrieved from the [OpenAlex](https://openalex.org/) open-access API. Key sources:

- Hoekstra & Mekonnen (2012) — *The water footprint of humanity*, PNAS
- Jalava et al. (2012) — *Diet, food waste, and water footprint*, Environ. Res. Lett.
- Dalin et al. (2012) — *Evolution of the global virtual water trade network*, PNAS
- Mekonnen & Hoekstra (2010) — *The green, blue, and grey water footprint of crops and derived crop products*
- Chapagain & Hoekstra (2011) — *Water footprint of coffee and tea*, Ecol. Indic.

Full reference list with DOIs is in `docs/Water_Use_Eco_Ideation_Sliders.docx`.

---

## Source paper

> Bocken, N.M.P., Allwood, J.M., Willey, A.R., & King, J.M.H. (2011).  
> **Development of an eco-ideation tool to identify more sustainable product design opportunities.**  
> *Journal of Cleaner Production*, 19(12), 1323–1336.  
> Stored at: `docs/Bockenetal2011_Developmentofaneco-ideationtool.pdf`

---

## License

This project is for educational and research purposes. The methodology is derived from the open literature. The Bocken et al. (2011) paper remains the intellectual property of its authors and publisher.
