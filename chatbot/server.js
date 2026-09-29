'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SESSIONS_DIR = path.join(__dirname, 'sessions');
fs.mkdirSync(SESSIONS_DIR, { recursive: true });

// ── LLM setup ──────────────────────────────────────────────────────────────
let AI_OK = false, geminiModel;
if (process.env.GEMINI_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: { maxOutputTokens: 300, temperature: 0.75 }
    });
    AI_OK = true;
    console.log('✓ Gemini 1.5 Flash connected — AI mode active');
  } catch (e) {
    console.warn('Gemini init failed:', e.message, '— falling back to scripted mode');
  }
}
if (!AI_OK) console.log('ℹ  No GEMINI_API_KEY — running in scripted mode');

// ── Slider definitions ─────────────────────────────────────────────────────
const SLIDERS = [
  { id:  1, section: 'Product Design',
    title: 'Material Origin',
    question: 'What is the primary material or ingredient derived from — animal, plant, or synthetic sources? Animal products carry a water footprint up to 20× larger per calorie than plant equivalents.',
    best:   'Plant-based or synthetic with inherently low water input',
    medium: 'Plant-based with moderate water requirements (e.g. wheat, maize)',
    worst:  'Animal-derived inputs (meat, dairy, wool, leather)' },

  { id:  2, section: 'Product Design',
    title: 'Crop / Material Water Intensity',
    question: 'How water-intensive is the dominant crop or raw material? Is it irrigated or rainfed, and grown in a water-abundant or water-scarce region?',
    best:   'Rainfed, low-water-intensity crop in a water-abundant region',
    medium: 'Moderate irrigation or grown in a moderately stressed basin',
    worst:  'Heavily irrigated crop (cotton, rice, sugarcane) in a water-scarce basin' },

  { id:  3, section: 'Product Design',
    title: 'Sourcing Basin Water Stress',
    question: 'Are the agricultural or raw material inputs sourced from water-stressed regions, or can they be sourced locally from water-abundant areas?',
    best:   'Sourced locally / regionally from low-water-stress basins',
    medium: 'Regional sourcing with moderate seasonal water stress',
    worst:  'Global sourcing from high-stress basins (e.g. Aral Sea cotton, Ganges rice)' },

  { id:  4, section: 'Product Design',
    title: 'Product Concentration',
    question: 'Is the product sold in a concentrated form that minimises water embedded in unnecessary dilute components? Can water be added closer to the point of use?',
    best:   'Highly concentrated — diluted by consumer at point of use',
    medium: 'Partially concentrated; some further reduction possible',
    worst:  'Sold pre-diluted or in low-concentration form; maximum embedded water volume' },

  { id:  5, section: 'Product Design',
    title: 'Durability and Service Life',
    question: 'How long does the product remain in active use? A longer service life amortises the embedded water footprint across more use cycles.',
    best:   'Long-lasting; designed for repair, refurbishment, multi-decade use',
    medium: 'Average market lifetime; moderate durability',
    worst:  'Single-use or short-lived; embedded water wasted after one use' },

  { id:  6, section: 'Product Design',
    title: 'Recycled Content and Recyclability',
    question: 'Does the product use recycled material inputs, and can it be fully recycled at end of life to offset the water cost of future virgin-material production?',
    best:   'High recycled content; fully recyclable; closed-loop material design',
    medium: 'Some recycled content or partially recyclable',
    worst:  'Virgin materials only; non-recyclable or downcycled at end of life' },

  { id:  7, section: 'Product Design',
    title: 'Food and Material Waste by Design',
    question: 'How much of the product and its ingredients is typically wasted before consumption? Can design (portion size, shelf life, packaging) reduce this?',
    best:   'Negligible waste; right-sized portions; full ingredient utilisation',
    medium: 'Some waste at consumer or supply chain stage; not fully optimised',
    worst:  'High waste fraction; large agricultural water investment in discarded material' },

  { id:  8, section: 'Processing & Value Chain',
    title: 'Wet Processing Intensity',
    question: 'How much water-intensive wet processing (dyeing, washing, bleaching, rinsing, cooling) does the product undergo during manufacturing? Is process water recirculated?',
    best:   'Dry or near-dry processing; minimal wet steps; full water recirculation',
    medium: 'Some wet processing; partial water efficiency measures in place',
    worst:  'Multiple intensive wet stages (e.g. cotton dyeing + finishing) with no recirculation' },

  { id:  9, section: 'Processing & Value Chain',
    title: 'Industrial Cooling Water Demand',
    question: 'How much cooling water is required in production (distillation, pasteurisation, metal quenching)? Is cooling water recirculated or discharged after single use?',
    best:   'Closed-loop cooling; zero freshwater withdrawals for cooling',
    medium: 'Partial recirculation; some once-through cooling',
    worst:  'Open once-through cooling from freshwater sources; high withdrawal volumes' },

  { id: 10, section: 'Processing & Value Chain',
    title: 'Supply Chain Loss Rate',
    question: 'What proportion of water-intensive raw materials is lost or wasted between extraction/harvest and the finished product? Each percentage point of loss wastes the same fraction of all upstream water.',
    best:   'Near-zero supply chain losses; highly efficient processing and distribution',
    medium: 'Moderate losses (10–20%); typical of efficient industrial systems',
    worst:  'High loss rate (>25%); large volumes of agricultural water embedded in waste' },

  { id: 11, section: 'Processing & Value Chain',
    title: 'Virtual Water Trade Distance',
    question: 'How far does embedded (virtual) water travel through the supply chain? Globalised sourcing displaces water stress to remote, often more water-scarce basins.',
    best:   'Short supply chains; water use is local / regional and transparent',
    medium: 'Some global sourcing; moderate virtual water transfer',
    worst:  'Fully globalised supply chain; all water stress displaced to distant, scarce basins' },

  { id: 12, section: 'Processing & Value Chain',
    title: 'Consumer Use Water',
    question: 'How much water does the consumer use during the product\'s active life (laundry, rinsing, dilution, preparation)? Can product design reduce frequency or volume per use?',
    best:   'No consumer-phase water use; or design minimises wash frequency and temperature',
    medium: 'Moderate consumer water use; standard wash or preparation volumes',
    worst:  'High consumer water per cycle; frequent or high-temperature washing required' },

  { id: 13, section: 'Processing & Value Chain',
    title: 'Cold Chain and Freshness Preservation',
    question: 'Does the supply chain rely on refrigerated transport or water-intensive freshness preservation (e.g. ice packing, hydrocooling) that adds further water withdrawals?',
    best:   'Ambient temperature distribution; no cold-chain water use',
    medium: 'Limited refrigeration; some hydrocooling or ice at key nodes',
    worst:  'Continuous refrigerated chain with hydrocooling or water-ice at multiple stages' },

  { id: 14, section: 'Processing & Value Chain',
    title: 'End-of-Life Water Recovery',
    question: 'Does end-of-life treatment (recycling, composting, return schemes) recover the water investment in the product\'s materials, or is embedded water written off at disposal?',
    best:   'High recycling / composting rate; embedded water recovered through material loops',
    medium: 'Partial recycling; some material recovery',
    worst:  'Landfill or incineration; all embedded water written off at end of life' },
];

// ── Scripted probes (5 per slider, cycling facilitator questions) ───────────
const PROBES = {
  1: [
    "What's the primary material or ingredient in your product today — plant-based, animal-derived, or synthetic?",
    "What drives that choice — functional necessity, cost, consumer expectation, or just inherited from the original design?",
    "Are there lower-water alternatives that could deliver the same core function? Think recycled fibres, plant-based substitutes, or bio-synthetics.",
    "What would the biggest barrier be to making that switch — technical, commercial, or consumer acceptance? What would it take to overcome it?",
    "Have any competitors in adjacent markets already made this material shift? What can you learn from how they did it?"
  ],
  2: [
    "Which specific crops or raw materials go into the product, and do you know roughly where they're grown — which country or region?",
    "Are those crops typically irrigated or rainfed? Does your supply chain distinguish between the two when it sources?",
    "Could you substitute the highest-water-intensity ingredient with a lower-water equivalent — a different grain, fibre, or oil — without compromising the core function?",
    "Could you reduce the quantity of the most water-intensive ingredient in the formulation without the consumer noticing a difference?",
    "Are your agricultural suppliers measuring and reporting their water use at field level? What would it take to start tracking this?"
  ],
  3: [
    "Do you know whether your key agricultural or raw material inputs are sourced from water-stressed regions — Central Asia, the Nile basin, parts of India or China?",
    "Does your procurement team track water scarcity at basin level, or only at country level? What data do you currently have?",
    "Are there equivalent suppliers in lower-stress regions? What would it cost — in price, quality, or logistics — to shift or dual-source?",
    "Could water-basin stress become a formal supplier selection criterion alongside price and quality? What would that policy look like?",
    "Have you considered mapping your virtual water footprint by basin — overlaying where water is withdrawn against that basin's scarcity level?"
  ],
  4: [
    "Is the product currently sold at full dilution — ready to use straight from the pack — or is there already some concentration?",
    "What would need to change — chemically, physically, or in packaging — to make a more concentrated version viable?",
    "Could consumers add water at home or at the point of use? What usability challenges would that create, and how have other products solved them?",
    "Are any competitors offering a more concentrated or waterless format in this category? What enabled them to make that shift?",
    "For a 2× concentrated version, what's the estimated reduction in embedded water per unit sold? Is there a cost benefit as well?"
  ],
  5: [
    "What's the actual in-use lifetime of this product — not the designed lifetime, but the real-world average before disposal?",
    "What causes most products to be discarded — wear-out, functional failure, aesthetic obsolescence, or just consumer habit?",
    "What design changes could extend active lifetime by 50%? Think materials, modularity, repairability, or protective features.",
    "Could you offer repair services, spare parts, or a refurbishment scheme? What's the biggest organisational barrier to doing that?",
    "If the product lasted twice as long, what would that mean for the embedded water footprint per year of actual use?"
  ],
  6: [
    "What percentage of the product's materials currently comes from recycled or recovered sources?",
    "What's blocking a higher recycled content — technical quality constraints, supply availability, price premium, or consumer perception?",
    "At end of life, can the materials be cleanly separated and fed back into a recycling stream, or are they composite and difficult to recover?",
    "Have you explored any closed-loop take-back schemes that would recover your materials and reduce dependence on virgin inputs?",
    "Is there a recycled-content certification or label that your customers would value — and that might open a premium or B2B market?"
  ],
  7: [
    "What proportion of your product — or its agricultural ingredients — is typically wasted between production and consumption?",
    "Where in the supply chain does most of that loss happen — harvesting, storage in transit, retail spoilage, or at the consumer end?",
    "Are packaging formats, portion sizes, or shelf life the primary waste drivers? What's the single biggest trigger you can identify?",
    "Could redesigning the portion size, packaging configuration, or product form significantly reduce the waste fraction?",
    "If you could eliminate 20% of supply chain waste, what would that save in water and cost terms per year? Is there a business case?"
  ],
  8: [
    "How many wet processing steps does the product go through — dyeing, washing, rinsing, bleaching, coating, finishing?",
    "Is process water recirculated after each step, or discharged after single use? Is the discharge treated before release?",
    "Are there dry or low-water alternatives for any of those steps — digital printing, foam dyeing, plasma surface treatment, or CO₂ processing?",
    "Which single wet processing step consumes the most water per unit produced? What would a 50% reduction in that step require?",
    "Are your manufacturing partners measuring and reporting water intensity per unit of output? What would benchmarking against best-in-class look like?"
  ],
  9: [
    "Does production involve significant thermal operations — distillation, pasteurisation, extrusion, metal quenching — that need cooling water?",
    "Is the cooling water in a closed loop, or once-through from a freshwater source? What happens to it after it's been used?",
    "Has your facility explored air cooling, dry cooling towers, or heat recovery systems to reduce freshwater withdrawal?",
    "What fraction of total site water use goes to cooling specifically? Is that tracked at the facility level?",
    "Could waste heat from the cooling process be recovered and used elsewhere — reducing both energy costs and water intensity simultaneously?"
  ],
  10: [
    "What percentage of raw materials is lost or wasted between farm gate or extraction site and your finished product?",
    "Where are the biggest loss points — agricultural harvest, storage and transport, processing trim, or quality rejections at intake?",
    "Have you set a supply chain loss rate target? How does your current rate compare to published industry best practice?",
    "Could by-products or waste streams from your processing be valorised — sold as input elsewhere, composted, or recovered as energy?",
    "Is there a financial case for investing in loss-reduction infrastructure at key supply chain nodes? What's the rough payback period?"
  ],
  11: [
    "Do you know which river basins your key agricultural inputs draw from — not just which countries, but which specific watersheds?",
    "Is your supply chain's virtual water footprint currently measured or estimated? Has anyone in your sector mapped their flows?",
    "Could you source any high-water-intensity inputs more locally, or from suppliers located in lower-stress basins without sacrificing quality?",
    "Have you considered using a water-stress weighting — like the ReCiPe LCIA method — to prioritise which supply chain nodes to address first?",
    "Is there a supplier engagement programme you could launch that asks key suppliers to report water withdrawal and basin stress levels annually?"
  ],
  12: [
    "How much water does a typical consumer use with this product per use cycle, per week, and over its full lifetime?",
    "Is the consumer water use driven by product design choices — for example, does it soil quickly, or do care label instructions require hot washing?",
    "Could the product be redesigned to reduce wash frequency, lower the required wash temperature, or need less rinsing?",
    "Are there waterless or low-water formats in adjacent product categories that have worked commercially? What made them viable?",
    "If care instructions could be changed to reduce wash temperature by 20°C, what would that save per consumer per year — in water and energy?"
  ],
  13: [
    "Does your product require refrigerated transport, cold storage, or ice packing at any point in the supply chain?",
    "At which logistics nodes is the most cooling energy and water used? Is that data available from your logistics partners?",
    "Could shelf life extension — through formulation changes, modified atmosphere packaging, or different preservation techniques — reduce cold chain requirements?",
    "Are any of your logistics partners investing in more water-efficient cooling — closed-loop refrigeration, phase-change materials?",
    "What's the trade-off between extending shelf life chemically versus maintaining cold chain water use — which has the lower overall water footprint?"
  ],
  14: [
    "Where does your product actually end up at end of life today — landfill, incineration, mixed recycling, or a dedicated take-back scheme?",
    "What percentage is actually recycled versus what's technically recyclable? Is there a gap, and what's causing it?",
    "Is there a deposit or take-back scheme operating in your sector? What would it take to implement one for this product category?",
    "If the embedded water investment in your product's materials were made visible to consumers, would that change their disposal behaviour?",
    "Could you design a modular product where the most water-intensive components are recovered and reused in the next product generation?"
  ]
};

// Scripted wrap-up after probes are exhausted
const WRAPUPS = [
  null, // placeholder for 1-based indexing
  "That's a rich discussion on material origin. Ready to look at how water-intensive the specific crop or material is?",
  "Good thinking on crop water intensity. Shall we move on to where those materials are actually sourced — and whether those basins are water-stressed?",
  "Useful insights on sourcing geography. Let's now look at whether the product itself could carry less water by being more concentrated.",
  "Solid ideas on concentration. Next, let's examine how long the product stays in active use — durability is a powerful lever.",
  "Great on durability. Let's turn to recycled content and recyclability — another upstream water multiplier.",
  "Useful discussion on material loops. Let's look at waste by design — especially food and ingredient waste, which is the single biggest recoverable opportunity.",
  "That covers the product design sliders. Now we move into the supply chain. First up: how much wet processing does manufacturing involve?",
  "Good on wet processing. Let's look at industrial cooling water next — often the silent majority of a manufacturing site's water withdrawal.",
  "Useful on cooling water. Now let's examine how much material is lost or wasted across the supply chain before it even reaches the consumer.",
  "Good thinking on supply chain losses. Next: how far does virtual water travel through your trade routes, and what does that mean for basin stress?",
  "Insightful on virtual water flows. Let's now look at the consumer use phase — particularly relevant if the product involves laundry or regular rinsing.",
  "Good on consumer use. Now let's check the cold chain — refrigeration and hydrocooling add water costs that are often overlooked.",
  "Useful on the cold chain. Last one: end of life. Does the water embedded in your materials get recovered, or written off?",
  "Excellent — we've worked through all 14 water sliders. Click 'View Report' to see your full session log and idea summary."
];

// System prompt for AI mode
function systemPrompt(sl) {
  return `You are an expert eco-design facilitator running a structured water footprint ideation workshop.

CURRENT SLIDER: ${sl.id}/14 — ${sl.title} (${sl.section})
LEADING QUESTION: ${sl.question}
SCALE:
  BEST:   ${sl.best}
  MEDIUM: ${sl.medium}
  WORST:  ${sl.worst}

YOUR ROLE (Bocken et al. 2011, Section 3.4 methodology):
- Help the team understand where their product currently sits on this scale
- Ask Socratic probing questions to surface specific, actionable improvement ideas
- Challenge assumptions gently: if they say "that's not possible", ask what would need to change
- Connect insights to the scale so the team can see which band they're in
- Keep responses under 80 words; end every reply with ONE follow-up question
- After 3+ exchanges, offer to wrap up and move to the next slider

When the user mentions a concrete improvement idea, affirm it explicitly and suggest they log it.
Tone: Collaborative, curious, encouraging. Never lecture. Ask, don't tell.`;
}

// ── Session management ─────────────────────────────────────────────────────
const sessions = new Map();

function freshSession(id, productName) {
  return {
    id, productName,
    startedAt: new Date().toISOString(),
    currentSlider: 0,
    sliders: SLIDERS.map(s => ({
      id: s.id, title: s.title, section: s.section,
      score: null, rating: null,
      probeIndex: 0,
      ideas: [], messages: []
    }))
  };
}

function persist(sess) {
  fs.writeFileSync(
    path.join(SESSIONS_DIR, `${sess.id}.json`),
    JSON.stringify(sess, null, 2)
  );
}

// ── Routes ─────────────────────────────────────────────────────────────────
app.get('/api/mode', (_req, res) => res.json({ ai: AI_OK }));

app.post('/api/session/new', (req, res) => {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const sess = freshSession(id, (req.body.productName || 'Product').trim());
  sessions.set(id, sess);
  persist(sess);
  res.json({ sessionId: id, totalSliders: SLIDERS.length });
});

app.get('/api/session/:id', (req, res) => {
  const sess = sessions.get(req.params.id);
  if (!sess) return res.status(404).json({ error: 'Not found' });
  res.json(sess);
});

// Returns the bot's opening message for the current slider
app.post('/api/intro', async (req, res) => {
  const sess = sessions.get(req.body.sessionId);
  if (!sess) return res.status(404).json({ error: 'Not found' });

  const idx = sess.currentSlider;
  if (idx >= SLIDERS.length) {
    return res.json({ text: WRAPUPS[14], done: true });
  }

  const sl = SLIDERS[idx];
  let text;

  if (AI_OK && geminiModel) {
    try {
      const chat = geminiModel.startChat({
        systemInstruction: systemPrompt(sl),
        history: []
      });
      const r = await chat.sendMessage(
        'SESSION_START: Introduce this slider topic briefly (1-2 sentences on why it matters for water) then ask the leading question. Be warm and concise.'
      );
      text = r.response.text().trim();
    } catch (e) {
      console.error('Gemini intro error:', e.message);
      text = sl.question;
    }
  } else {
    text = sl.question;
  }

  const slSess = sess.sliders[idx];
  slSess.messages.push({ role: 'bot', text, ts: Date.now() });
  persist(sess);

  res.json({ text, slider: { id: sl.id, title: sl.title, section: sl.section, best: sl.best, medium: sl.medium, worst: sl.worst } });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  const { sessionId, message } = req.body;
  const sess = sessions.get(sessionId);
  if (!sess) return res.status(404).json({ error: 'Not found' });

  const idx = sess.currentSlider;
  if (idx >= SLIDERS.length) return res.json({ text: WRAPUPS[14], done: true });

  const sl = SLIDERS[idx];
  const slSess = sess.sliders[idx];

  slSess.messages.push({ role: 'user', text: message, ts: Date.now() });

  let text;
  const canAdvance = slSess.probeIndex >= 3;

  if (AI_OK && geminiModel) {
    // Build history (skip the very first bot intro as that's already in system context)
    const history = slSess.messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));
    try {
      const chat = geminiModel.startChat({ systemInstruction: systemPrompt(sl), history });
      const r = await chat.sendMessage(message);
      text = r.response.text().trim();
    } catch (e) {
      console.error('Gemini chat error:', e.message);
      text = scriptedReply(sl.id, slSess.probeIndex, canAdvance, idx);
      slSess.probeIndex++;
    }
  } else {
    text = scriptedReply(sl.id, slSess.probeIndex, canAdvance, idx);
    slSess.probeIndex++;
  }

  slSess.messages.push({ role: 'bot', text, ts: Date.now() });
  persist(sess);

  res.json({ text, canAdvance: slSess.probeIndex >= 3 || canAdvance });
});

function scriptedReply(sliderId, probeIdx, canAdvance, sliderArrayIdx) {
  const probes = PROBES[sliderId] || [];
  if (canAdvance && probeIdx >= probes.length) {
    return WRAPUPS[sliderId] || 'Ready to move to the next slider?';
  }
  return probes[Math.min(probeIdx, probes.length - 1)] || WRAPUPS[sliderId];
}

// Log an idea
app.post('/api/idea', (req, res) => {
  const { sessionId, idea } = req.body;
  const sess = sessions.get(sessionId);
  if (!sess) return res.status(404).json({ error: 'Not found' });

  const slSess = sess.sliders[sess.currentSlider];
  if (slSess && idea && idea.trim()) {
    slSess.ideas.push({ text: idea.trim(), ts: Date.now() });
    persist(sess);
  }
  res.json({ ok: true, count: slSess ? slSess.ideas.length : 0 });
});

// Set score for current slider
app.post('/api/score', (req, res) => {
  const { sessionId, score } = req.body;
  const sess = sessions.get(sessionId);
  if (!sess) return res.status(404).json({ error: 'Not found' });

  const slSess = sess.sliders[sess.currentSlider];
  if (slSess) {
    slSess.score  = Number(score);
    slSess.rating = score >= 67 ? 'Best' : score >= 34 ? 'Medium' : 'Worst';
  }
  persist(sess);
  res.json({ ok: true });
});

// Advance to next slider
app.post('/api/next', (req, res) => {
  const sess = sessions.get(req.body.sessionId);
  if (!sess) return res.status(404).json({ error: 'Not found' });
  if (sess.currentSlider < SLIDERS.length) sess.currentSlider++;
  persist(sess);
  const done = sess.currentSlider >= SLIDERS.length;
  res.json({ done, currentSlider: sess.currentSlider });
});

// Export full session as JSON
app.get('/api/export/:id', (req, res) => {
  const sess = sessions.get(req.params.id);
  if (!sess) return res.status(404).json({ error: 'Not found' });

  const scored  = sess.sliders.filter(s => s.score !== null);
  const avg     = scored.length ? Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length) : null;
  const allIdeas = sess.sliders.flatMap(s => s.ideas.map(i => ({ slider: s.title, idea: i.text })));

  res.setHeader('Content-Disposition', `attachment; filename="ideation-${req.params.id}.json"`);
  res.json({
    ...sess,
    summary: {
      averageScore: avg,
      totalIdeas: allIdeas.length,
      allIdeas,
      lowestSliders: scored.sort((a, b) => a.score - b.score).slice(0, 3).map(s => ({ title: s.title, score: s.score }))
    }
  });
});

app.listen(PORT, () => {
  console.log(`\n  ✨  Eco-Ideation Chatbot  ✨`);
  console.log(`  Open: http://localhost:${PORT}`);
  console.log(`  Mode: ${AI_OK ? 'AI (Gemini 1.5 Flash)' : 'Scripted'}`);
  console.log(`  Sessions saved to: ${SESSIONS_DIR}\n`);
});
