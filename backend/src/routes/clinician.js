const router = require('express').Router();
const auth = require('../middleware/auth');
const Assessment = require('../models/Assessment');
const User = require('../models/User');

// GET /api/clinician/summary
router.get('/summary', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const mlRes = await fetch(`${process.env.ML_API_URL || 'http://localhost:8000'}/clinician/summary`, {
      signal: AbortSignal.timeout(5000),
    });
    if (mlRes.ok) {
      const summary = await mlRes.json();
      return res.json(summary);
    }
  } catch (err) {
    console.error('Error fetching ML clinician summary:', err);
  }

  // Fallback direct MongoDB aggregation
  try {
    const all = await Assessment.find({}).sort({ createdAt: -1 }).lean();
    const total = all.length;
    let highRisk = 0;
    const dist = { Low: 0, Moderate: 0, High: 0 };

    all.forEach(a => {
      const dep = a.depression?.label || 'Low';
      const anx = a.anxiety?.label || 'Low';
      const str = a.stress?.label || 'Low';

      const levels = [dep, anx, str];
      const overall = levels.includes('High') ? 'High' : (levels.includes('Moderate') ? 'Moderate' : 'Low');
      dist[overall] = (dist[overall] || 0) + 1;
      if (overall === 'High') highRisk++;
    });

    const recent = all.slice(0, 10).map(a => ({
      patient_id: a.userId ? 'PT-' + a.userId.toString().slice(-6).toUpperCase() : 'Guest',
      created_at: a.createdAt,
      overall_risk: a.depression?.level === 'High' || a.anxiety?.level === 'High' || a.stress?.level === 'High' ? 'High' : 'Low',
      depression_level: a.depression?.level || 'Low',
      anxiety_level: a.anxiety?.level || 'Low',
      stress_level: a.stress?.level || 'Low',
      top_emotions: a.emotion?.emotions?.map(e => e.label) || []
    }));

    res.json({
      total_patients: total,
      high_risk_cases: highRisk,
      risk_distribution: dist,
      recent_activity: recent
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate clinician summary' });
  }
});

// GET /api/clinician/cohort
router.get('/cohort', async (req, res) => {

  try {
    const assessments = await Assessment.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$userId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);

    const users = await User.find({ _id: { $in: assessments.map(a => a.userId).filter(Boolean) } })
      .select('_id name').lean();

    const cohort = assessments.map(a => ({
      _id: a._id,
      patientId: a.userId ? 'PT-' + a.userId.toString().slice(-6).toUpperCase() : 'Guest',
      ageGroup: a.formData?.age_group || 'Unknown',
      lastAssessment: a.createdAt,
      depression: a.depression,
      anxiety: a.anxiety,
      stress: a.stress,
      insomnia: a.insomnia || a.sleep,
      overallScore: a.overallScore || 50,
      top_emotions: a.emotion?.emotions?.map(e => e.label) || []
    }));

    res.json(cohort);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cohort data' });
  }
});

module.exports = router;
