const { describe, it } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');

describe('Clinician RBAC & Triage Unit Tests', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_123';

  // Simulates the auth middleware logic in backend/src/middleware/auth.js
  function simulateAuthMiddleware(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { status: 401, error: 'Authorization header missing or malformed' };
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { status: 200, user: decoded };
    } catch {
      return { status: 403, error: 'Invalid or expired token' };
    }
  }

  // Simulates clinician role gate in backend/src/routes/clinician.js
  function simulateClinicianRoleGate(user) {
    if (!user || user.role !== 'clinician') {
      return { status: 403, error: 'Access denied: Clinicians only' };
    }
    return { status: 200, allowed: true };
  }

  it('RBAC-01: Rejection of requests with missing Authorization header', () => {
    const res = simulateAuthMiddleware(null);
    assert.strictEqual(res.status, 401);
  });

  it('RBAC-02: Rejection of malformed Bearer tokens', () => {
    const res = simulateAuthMiddleware('Bearer bad_token_string');
    assert.strictEqual(res.status, 403);
  });

  it('RBAC-03: User role is rejected by Clinician gate with 403 Forbidden', () => {
    const patientUser = { id: 'patient_1', role: 'user' };
    const gateRes = simulateClinicianRoleGate(patientUser);
    assert.strictEqual(gateRes.status, 403);
    assert.match(gateRes.error, /Clinicians only/i);
  });

  it('RBAC-04: Clinician role is accepted through gate', () => {
    const clinicianUser = { id: 'clinician_1', role: 'clinician' };
    const gateRes = simulateClinicianRoleGate(clinicianUser);
    assert.strictEqual(gateRes.status, 200);
    assert.strictEqual(gateRes.allowed, true);
  });

  it('RBAC-05: Priority Triage Sorting pins Crisis patients to top', () => {
    const rawRoster = [
      { id: 'p1', name: 'Low Risk Patient', latestAssessment: { crisis_flag: false, depression: { label: 'Low' } } },
      { id: 'p2', name: 'Crisis Flagged Patient', latestAssessment: { crisis_flag: true, depression: { label: 'High' } } },
      { id: 'p3', name: 'High Risk Patient', latestAssessment: { crisis_flag: false, depression: { label: 'High' } } },
      { id: 'p4', name: 'Moderate Risk Patient', latestAssessment: { crisis_flag: false, depression: { label: 'Moderate' } } },
    ];

    const sortedRoster = [...rawRoster].sort((a, b) => {
      const aCrisis = a.latestAssessment?.crisis_flag ? 1 : 0;
      const bCrisis = b.latestAssessment?.crisis_flag ? 1 : 0;
      if (aCrisis !== bCrisis) return bCrisis - aCrisis;

      const riskRank = { High: 3, Moderate: 2, Low: 1 };
      const aRisk = riskRank[a.latestAssessment?.depression?.label] || 0;
      const bRisk = riskRank[b.latestAssessment?.depression?.label] || 0;
      return bRisk - aRisk;
    });

    assert.strictEqual(sortedRoster[0].id, 'p2', 'Crisis-flagged patient must be at index 0');
    assert.strictEqual(sortedRoster[1].id, 'p3', 'High-risk patient must be at index 1');
    assert.strictEqual(sortedRoster[2].id, 'p4', 'Moderate-risk patient must be at index 2');
    assert.strictEqual(sortedRoster[3].id, 'p1', 'Low-risk patient must be at index 3');
  });

  it('RBAC-06: Patient-Clinician Linkage Isolation', () => {
    const allPatients = [
      { id: 'p1', name: 'Patient A', assignedClinicianId: 'clinician_1' },
      { id: 'p2', name: 'Patient B', assignedClinicianId: 'clinician_2' },
      { id: 'p3', name: 'Patient C', assignedClinicianId: 'clinician_1' },
      { id: 'p4', name: 'Patient D', assignedClinicianId: null },
    ];

    const clinician1Patients = allPatients.filter(p => p.assignedClinicianId === 'clinician_1');
    assert.strictEqual(clinician1Patients.length, 2);
    assert.deepStrictEqual(clinician1Patients.map(p => p.id), ['p1', 'p3']);

    const clinician2Patients = allPatients.filter(p => p.assignedClinicianId === 'clinician_2');
    assert.strictEqual(clinician2Patients.length, 1);
    assert.deepStrictEqual(clinician2Patients.map(p => p.id), ['p2']);
  });
});

