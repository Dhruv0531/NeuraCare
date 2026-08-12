const router = require('express').Router();
const auth = require('../middleware/auth');
const Assessment = require('../models/Assessment');

// Helper: call ML API or use mock
async function getPredictions(formData) {
  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(`${process.env.ML_API_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error('ML API error');
    return await res.json();
  } catch {
    // Mock predictions when ML API is offline
    return generateMockPredictions(formData);
  }
}

function generateMockPredictions(formData) {
  // Use PHQ-9 score to simulate depression
  const phqFields = ['phq_interest','phq_depressed','phq_sleep','phq_tired','phq_appetite','phq_failure','phq_concentrate','phq_slow_restless','phq_self_harm'];
  const gadFields = ['gad_nervous','gad_cant_stop','gad_worry_much','gad_relax','gad_restless','gad_irritable','gad_afraid'];

  const phqScore = phqFields.reduce((s, f) => s + (parseInt(formData[f]) || 0), 0);
  const gadScore = gadFields.reduce((s, f) => s + (parseInt(formData[f]) || 0), 0);

  const toLabel = (pct) => pct < 33 ? 'Low' : pct < 66 ? 'Moderate' : 'High';
  const toPct = (raw, max) => Math.round((raw / max) * 100);

  const depScore = toPct(phqScore, 27);
  const anxScore = toPct(gadScore, 21);
  const strScore = Math.min(100, 40 + Math.floor(Math.random() * 40));
  const insScore = Math.min(100, 20 + Math.floor(Math.random() * 40));
  const overall = Math.round((depScore + anxScore + strScore + insScore) / 4);

  const makeProbs = (score) => {
    const h = score / 100;
    const l = Math.max(0, 1 - h - 0.3);
    const m = Math.max(0, 1 - h - l);
    return { low: parseFloat(l.toFixed(2)), moderate: parseFloat(m.toFixed(2)), high: parseFloat(h.toFixed(2)) };
  };

  return {
    overallScore: overall,
    depression: { label: toLabel(depScore), score: depScore, probabilities: makeProbs(depScore) },
    anxiety: { label: toLabel(anxScore), score: anxScore, probabilities: makeProbs(anxScore) },
    stress: { label: toLabel(strScore), score: strScore, probabilities: makeProbs(strScore) },
    insomnia: { label: toLabel(insScore), score: insScore, probabilities: makeProbs(insScore) },
    shapValues: {
      depression: [
        { feature: 'phq_depressed', value: 0.42 },
        { feature: 'phq_tired', value: 0.31 },
        { feature: 'sleep_quality', value: -0.28 },
        { feature: 'phq_interest', value: 0.25 },
        { feature: 'exercise_frequency', value: -0.19 },
        { feature: 'phq_concentrate', value: 0.17 },
        { feature: 'work_pressure', value: 0.14 },
        { feature: 'phq_failure', value: 0.12 },
      ],
      anxiety: [
        { feature: 'gad_nervous', value: 0.38 },
        { feature: 'work_pressure', value: 0.29 },
        { feature: 'gad_cant_stop', value: 0.24 },
        { feature: 'sleep_quality', value: -0.22 },
        { feature: 'gad_afraid', value: 0.18 },
        { feature: 'exercise_frequency', value: -0.15 },
        { feature: 'screen_time', value: 0.13 },
        { feature: 'gad_irritable', value: 0.11 },
      ],
      stress: [
        { feature: 'work_pressure', value: 0.51 },
        { feature: 'stress_frequency', value: 0.44 },
        { feature: 'deadline_anxiety', value: 0.33 },
        { feature: 'sleep_hours', value: -0.25 },
        { feature: 'exercise_frequency', value: -0.21 },
        { feature: 'screen_time', value: 0.18 },
        { feature: 'alcohol', value: 0.12 },
        { feature: 'sleep_quality', value: -0.11 },
      ],
      insomnia: [
        { feature: 'sleep_quality', value: 0.39 },
        { feature: 'sleep_hours', value: 0.31 },
        { feature: 'screen_time', value: 0.22 },
        { feature: 'exercise_frequency', value: -0.19 },
        { feature: 'stress_frequency', value: 0.16 },
        { feature: 'alcohol', value: 0.11 },
        { feature: 'phq_sleep', value: 0.10 },
        { feature: 'gad_nervous', value: 0.08 },
      ],
    },
  };
}

// POST /api/assessment/submit
router.post('/submit', async (req, res) => {
  try {
    const predictions = await getPredictions(req.body);

    // Try to save if user is authenticated
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
        // Not authenticated — return predictions without saving
      }
    }

    res.json({ ...predictions, _id: 'guest_' + Date.now(), createdAt: new Date().toISOString() });
  } catch (err) {
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
