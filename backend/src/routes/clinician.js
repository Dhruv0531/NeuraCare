const router = require('express').Router();
const auth = require('../middleware/auth');
const Assessment = require('../models/Assessment');
const User = require('../models/User');

// GET /api/clinician/cohort
router.get('/cohort', auth, async (req, res) => {
  if (req.user.role !== 'clinician') {
    return res.status(403).json({ message: 'Access denied' });
  }
  try {
    // Get latest assessment per user
    const assessments = await Assessment.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$userId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);

    const users = await User.find({ _id: { $in: assessments.map(a => a.userId) } })
      .select('_id name').lean();

    const userMap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

    const cohort = assessments.map(a => ({
      _id: a._id,
      patientId: 'PT-' + a.userId.toString().slice(-6).toUpperCase(),
      ageGroup: a.formData?.age_group || 'Unknown',
      lastAssessment: a.createdAt,
      depression: a.depression,
      anxiety: a.anxiety,
      stress: a.stress,
      insomnia: a.insomnia,
      overallScore: a.overallScore,
    }));

    res.json(cohort);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cohort data' });
  }
});

module.exports = router;
