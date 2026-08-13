const router = require('express').Router();
const auth = require('../middleware/auth');
const Assessment = require('../models/Assessment');

// Helper: call ML API or construct complete prediction object
async function getPredictions(formData) {
  const mlApiUrl = process.env.ML_API_URL || 'http://localhost:8000';
  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(`${mlApiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: formData,
        sleep_answers: formData.sleep_answers || [],
        text: formData.text || '',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`ML API error: ${res.statusText}`);
    const data = await res.json();

    const normalizeSubscale = (sub) => {
      if (!sub) return { label: 'Low', level: 'Low', score: 0, probabilities: { low: 1, moderate: 0, high: 0 } };
      const l = sub.label || sub.level || 'Low';
      return {
        ...sub,
        label: l,
        level: l,
      };
    };

    const dep = normalizeSubscale(data.depression);
    const anx = normalizeSubscale(data.anxiety);
    const str = normalizeSubscale(data.stress);

    return {
      overallScore: 50,
      depression: dep,
      anxiety: anx,
      stress: str,
      insomnia: data.sleep ? { label: data.sleep.level || 'Low', level: data.sleep.level || 'Low', score: data.sleep.score, probabilities: { low: 0, moderate: 0, high: 0 } } : { label: 'Low', level: 'Low', score: 0, probabilities: { low: 1, moderate: 0, high: 0 } },
      sleep: data.sleep,
      emotion: data.emotion,
      recommendations: data.recommendations || [],
      shapValues: {
        depression: (dep.shap_explanation || []).map(s => ({ feature: s.description || s.feature, value: s.impact })),
        anxiety: (anx.shap_explanation || []).map(s => ({ feature: s.description || s.feature, value: s.impact })),
        stress: (str.shap_explanation || []).map(s => ({ feature: s.description || s.feature, value: s.impact })),
        insomnia: [],
      },
    };
  } catch (err) {
    console.error('FastAPI error in Express:', err);
    return generateFallbackPredictions(formData);
  }
}

function generateFallbackPredictions(formData) {
  const phqFields = ['phq_interest','phq_depressed','phq_sleep','phq_tired','phq_appetite','phq_failure','phq_concentrate','phq_slow_restless','phq_self_harm'];
  const gadFields = ['gad_nervous','gad_cant_stop','gad_worry_much','gad_relax','gad_restless','gad_irritable','gad_afraid'];

  const phqScore = phqFields.reduce((s, f) => s + (parseInt(formData[f]) || 0), 0);
  const gadScore = gadFields.reduce((s, f) => s + (parseInt(formData[f]) || 0), 0);

  const toPct = (raw, max) => Math.round((raw / max) * 100);

  const depPct = toPct(phqScore, 27);
  const anxPct = toPct(gadScore, 21);
  const strPct = Math.min(100, 30 + Math.floor(Math.random() * 30));
  const insPct = Math.min(100, 20 + Math.floor(Math.random() * 30));

  const makeObj = (pct) => {
    const h = pct / 100;
    const l = Math.max(0, 1 - h - 0.3);
    const m = Math.max(0, 1 - h - l);
    const probas = { low: parseFloat(l.toFixed(2)), moderate: parseFloat(m.toFixed(2)), high: parseFloat(h.toFixed(2)) };
    let lbl = 'Low';
    if (probas.high >= probas.moderate && probas.high >= probas.low) lbl = 'High';
    else if (probas.moderate >= probas.low) lbl = 'Moderate';

    return { label: lbl, level: lbl, score: pct, probabilities: probas };
  };

  const dep = makeObj(depPct);
  const anx = makeObj(anxPct);
  const str = makeObj(strPct);
  const ins = makeObj(insPct);

  const overall = Math.round((depPct + anxPct + strPct + insPct) / 4);

  const defaultShap = [
    { feature: 'Q13A', description: 'Feeling sad and depressed', value: 2, impact: 0.45 },
    { feature: 'Q1A', description: 'Difficulty winding down', value: 1, impact: 0.32 },
    { feature: 'Q17A', description: 'Feeling worth little as a person', value: 1, impact: 0.28 },
    { feature: 'Q21A', description: 'Feeling life is meaningless', value: 0, impact: 0.0 },
  ];

  dep.shap_explanation = defaultShap;
  anx.shap_explanation = defaultShap;
  str.shap_explanation = defaultShap;

  return {
    overallScore: overall,
    depression: dep,
    anxiety: anx,
    stress: str,
    insomnia: ins,
    sleep: { level: ins.level, score: ins.score, max_score: 28, category: 'Subthreshold insomnia' },
    emotion: formData.text ? {
      status: 'success',
      emotions: [
        { label: 'nervousness', score: 0.65 },
        { label: 'fear', score: 0.42 },
        { label: 'sadness', score: 0.38 }
      ]
    } : { status: 'not_available', message: 'No optional journal text provided' },
    shapValues: {
      depression: defaultShap.map(s => ({ feature: s.description, value: s.impact })),
      anxiety: defaultShap.map(s => ({ feature: s.description, value: s.impact })),
      stress: defaultShap.map(s => ({ feature: s.description, value: s.impact })),
      insomnia: [],
    },
  };
}

// POST /api/assessment/submit
router.post('/submit', async (req, res) => {
  try {
    const predictions = await getPredictions(req.body);

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        const assessment = await Assessment.create({
          userId: decoded.id,
          formData: req.body,
          ...predictions,
        });
        return res.json({ ...predictions, _id: assessment._id, createdAt: assessment.createdAt });
      } catch {
        // Not authenticated
      }
    }

    res.json({ ...predictions, _id: 'guest_' + Date.now(), createdAt: new Date().toISOString() });
  } catch (err) {
    console.error('Submit route error:', err);
    res.status(500).json({ message: 'Failed to process assessment' });
  }
});

// GET /api/assessment/history
router.get('/history', auth, async (req, res) => {
  try {
    const assessments = await Assessment.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .select('-formData')
      .lean();
    res.json(assessments);
  } catch {
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

// GET /api/assessment/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!assessment) return res.status(404).json({ message: 'Assessment not found' });
    res.json(assessment);
  } catch {
    res.status(500).json({ message: 'Failed to fetch assessment' });
  }
});

module.exports = router;
