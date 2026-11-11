const router = require('express').Router();
const auth = require('../middleware/auth');
const Assessment = require('../models/Assessment');
const User = require('../models/User');

// Apply authentication to all clinician endpoints
router.use(auth);

// Role-Based Access Control: ensure only verified clinicians have access
router.use((req, res, next) => {
  if (req.user.role !== 'clinician') {
    return res.status(403).json({
      message: 'Access restricted: Mental health clinician credentials required to view patient records.'
    });
  }
  next();
});

// Helper: compute risk label
function getOverallRisk(assessment) {
  if (!assessment) return 'Low';
  const dep = assessment.depression?.label || assessment.depression?.level || 'Low';
  const anx = assessment.anxiety?.label || assessment.anxiety?.level || 'Low';
  const str = assessment.stress?.label || assessment.stress?.level || 'Low';
  if (dep === 'High' || anx === 'High' || str === 'High' || assessment.crisis_flag) return 'High';
  if (dep === 'Moderate' || anx === 'Moderate' || str === 'Moderate') return 'Moderate';
  return 'Low';
}

// GET /api/clinician/summary
// Returns overview analytics ONLY for patients linked to the authenticated clinician
router.get('/summary', async (req, res) => {
  try {
    const clinician = await User.findById(req.user.id).select('-password');
    if (!clinician) return res.status(404).json({ message: 'Clinician not found' });

    // Fetch all patients assigned to this clinician
    const linkedPatients = await User.find({ assignedClinicianId: req.user.id })
      .select('_id name email createdAt').lean();

    const patientIds = linkedPatients.map(p => p._id);

    // Fetch all assessments belonging to these linked patients
    const assessments = await Assessment.find({
      $or: [
        { userId: { $in: patientIds } },
        { clinicianId: req.user.id }
      ]
    }).sort({ createdAt: -1 }).lean();

    const dist = { Low: 0, Moderate: 0, High: 0 };
    let highRiskCount = 0;
    let crisisCount = 0;

    // Map each patient to their latest assessment
    const latestByPatient = new Map();
    assessments.forEach(a => {
      const uId = a.userId ? a.userId.toString() : null;
      if (uId && !latestByPatient.has(uId)) {
        latestByPatient.set(uId, a);
      }
    });

    latestByPatient.forEach(a => {
      const risk = getOverallRisk(a);
      dist[risk] = (dist[risk] || 0) + 1;
      if (risk === 'High') highRiskCount++;
      if (a.crisis_flag) crisisCount++;
    });

    const recentActivity = assessments.slice(0, 8).map(a => {
      const patient = linkedPatients.find(p => p._id.toString() === (a.userId ? a.userId.toString() : ''));
      return {
        _id: a._id,
        patient_id: a.userId ? 'PT-' + a.userId.toString().slice(-6).toUpperCase() : 'Guest',
        patient_name: patient ? patient.name : 'Linked Patient',
        created_at: a.createdAt,
        overall_risk: getOverallRisk(a),
        crisis_flag: !!a.crisis_flag,
        depression_level: a.depression?.level || a.depression?.label || 'Low',
        anxiety_level: a.anxiety?.level || a.anxiety?.label || 'Low',
        stress_level: a.stress?.level || a.stress?.label || 'Low',
        top_emotions: a.emotion?.emotions?.map(e => e.label) || []
      };
    });

    res.json({
      clinician: {
        id: clinician._id,
        name: clinician.name,
        email: clinician.email,
        specialty: clinician.specialty || 'Clinical Psychology',
        affiliation: clinician.affiliation || 'Clinical Practice',
        licenseNumber: clinician.licenseNumber || 'Verified',
        clinicianCode: clinician.clinicianCode || 'NOT_ASSIGNED',
      },
      total_patients: linkedPatients.length,
      total_assessments: assessments.length,
      high_risk_cases: highRiskCount,
      crisis_cases: crisisCount,
      risk_distribution: dist,
      recent_activity: recentActivity
    });
  } catch (err) {
    console.error('Clinician summary error:', err);
    res.status(500).json({ message: 'Failed to generate clinician summary' });
  }
});

// GET /api/clinician/patients
// Returns full roster of patients linked to this clinician with triage status
router.get('/patients', async (req, res) => {
  try {
    const linkedPatients = await User.find({ assignedClinicianId: req.user.id })
      .select('_id name email createdAt').lean();

    const patientIds = linkedPatients.map(p => p._id);

    const assessments = await Assessment.find({
      $or: [
        { userId: { $in: patientIds } },
        { clinicianId: req.user.id }
      ]
    }).sort({ createdAt: -1 }).lean();

    // Group assessments by patient
    const assessmentsByUser = {};
    assessments.forEach(a => {
      const uId = a.userId ? a.userId.toString() : 'unassigned';
      if (!assessmentsByUser[uId]) assessmentsByUser[uId] = [];
      assessmentsByUser[uId].push(a);
    });

    const roster = linkedPatients.map(patient => {
      const pAssessments = assessmentsByUser[patient._id.toString()] || [];
      const latest = pAssessments[0] || null;
      const overallRisk = latest ? getOverallRisk(latest) : 'Low';
      const isCrisis = latest ? !!latest.crisis_flag : false;

      return {
        _id: patient._id,
        patientId: 'PT-' + patient._id.toString().slice(-6).toUpperCase(),
        name: patient.name,
        email: patient.email,
        joinedAt: patient.createdAt,
        assessmentCount: pAssessments.length,
        lastAssessmentDate: latest ? latest.createdAt : null,
        overallRisk,
        isCrisis,
        latestAssessment: latest ? {
          _id: latest._id,
          overallScore: latest.overallScore || 50,
          depression: latest.depression,
          anxiety: latest.anxiety,
          stress: latest.stress,
          sleep: latest.sleep || latest.insomnia,
          crisis_flag: !!latest.crisis_flag,
          adaptive_insights: latest.formData?.adaptive_insights,
          top_emotions: latest.emotion?.emotions?.slice(0, 3) || []
        } : null
      };
    });

    // Triage sorting: Crisis cases first, then High Risk, then most recent assessment
    roster.sort((a, b) => {
      if (a.isCrisis && !b.isCrisis) return -1;
      if (!a.isCrisis && b.isCrisis) return 1;
      if (a.overallRisk === 'High' && b.overallRisk !== 'High') return -1;
      if (a.overallRisk !== 'High' && b.overallRisk === 'High') return 1;
      const dateA = a.lastAssessmentDate ? new Date(a.lastAssessmentDate).getTime() : 0;
      const dateB = b.lastAssessmentDate ? new Date(b.lastAssessmentDate).getTime() : 0;
      return dateB - dateA;
    });

    res.json(roster);
  } catch (err) {
    console.error('Clinician patients error:', err);
    res.status(500).json({ message: 'Failed to fetch patient roster' });
  }
});

// GET /api/clinician/patient/:id
// Returns full clinical history for one specific linked patient
router.get('/patient/:id', async (req, res) => {
  try {
    // Security check: verify patient belongs to this clinician
    const patient = await User.findOne({
      _id: req.params.id,
      assignedClinicianId: req.user.id
    }).select('-password').lean();

    if (!patient) {
      // Check if clinician has assessments with this patient ID
      const hasAssessment = await Assessment.findOne({
        userId: req.params.id,
        clinicianId: req.user.id
      });
      if (!hasAssessment) {
        return res.status(403).json({
          message: 'Access denied: Patient is not linked to your clinical practice.'
        });
      }
    }

    const patientDoc = patient || await User.findById(req.params.id).select('-password').lean();

    const assessments = await Assessment.find({
      userId: req.params.id
    }).sort({ createdAt: -1 }).lean();

    res.json({
      patient: {
        _id: patientDoc._id,
        patientId: 'PT-' + patientDoc._id.toString().slice(-6).toUpperCase(),
        name: patientDoc.name,
        email: patientDoc.email,
        joinedAt: patientDoc.createdAt
      },
      assessmentCount: assessments.length,
      history: assessments
    });
  } catch (err) {
    console.error('Clinician patient detail error:', err);
    res.status(500).json({ message: 'Failed to fetch patient history' });
  }
});

// GET /api/clinician/cohort
// Compatibility alias for aggregate views
router.get('/cohort', async (req, res) => {
  try {
    const linkedPatients = await User.find({ assignedClinicianId: req.user.id }).select('_id').lean();
    const patientIds = linkedPatients.map(p => p._id);

    const assessments = await Assessment.aggregate([
      { $match: { userId: { $in: patientIds } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$userId', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);

    const cohort = assessments.map(a => ({
      _id: a._id,
      patientId: a.userId ? 'PT-' + a.userId.toString().slice(-6).toUpperCase() : 'Guest',
      ageGroup: a.formData?.age || '18-24',
      lastAssessment: a.createdAt,
      depression: a.depression,
      anxiety: a.anxiety,
      stress: a.stress,
      insomnia: a.insomnia || a.sleep,
      overallScore: a.overallScore || 50,
      crisis_flag: !!a.crisis_flag,
      top_emotions: a.emotion?.emotions?.map(e => e.label) || []
    }));

    res.json(cohort);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch cohort data' });
  }
});

module.exports = router;
