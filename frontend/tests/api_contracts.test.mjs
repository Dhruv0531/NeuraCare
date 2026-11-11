import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Frontend API Contracts & Payload Utilities', () => {

  it('API-01: Header authorization injection with Bearer token', () => {
    function createAuthHeaders(token) {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
    }

    const unauthHeaders = createAuthHeaders(null);
    assert.strictEqual(unauthHeaders['Authorization'], undefined);

    const authHeaders = createAuthHeaders('sample_jwt_123');
    assert.strictEqual(authHeaders['Authorization'], 'Bearer sample_jwt_123');
  });

  it('API-02: Assessment submission payload assembly and normalization', () => {
    const rawForm = {
      phq_interest: 2,
      phq_depressed: 1,
      phq_sleep: 3,
      phq_tired: 2,
      phq_appetite: 1,
      phq_failure: 0,
      phq_concentrate: 1,
      phq_slow_restless: 0,
      phq_self_harm: 0,
      gad_nervous: 2,
      gad_cant_stop: 1,
      gad_worry_much: 2,
      gad_relax: 1,
      gad_restless: 0,
      gad_irritable: 1,
      gad_afraid: 0,
      sleep_answers: [2, 1, 2, 2, 1, 1, 2],
      text: 'Having a hard time unwinding after stressful shifts.',
      age: 29,
      gender: 1,
      adaptiveFollowups: {
        'phq_adaptive_fup_1': 2
      }
    };

    function buildSubmissionPayload(form) {
      return {
        ...form,
        formData: {
          ...form,
          timestamp: new Date().toISOString()
        }
      };
    }

    const payload = buildSubmissionPayload(rawForm);
    assert.strictEqual(payload.age, 29);
    assert.strictEqual(payload.sleep_answers.length, 7);
    assert.strictEqual(payload.formData.adaptiveFollowups['phq_adaptive_fup_1'], 2);
    assert.ok(payload.formData.timestamp);
  });

  it('API-03: Clinician triage client-side filtering and search matching', () => {
    const patients = [
      { id: '1', name: 'Alice Smith', email: 'alice@example.com', latestAssessment: { crisis_flag: false, depression: { label: 'Low' } } },
      { id: '2', name: 'Bob Jones', email: 'bob@example.com', latestAssessment: { crisis_flag: true, depression: { label: 'High' } } },
      { id: '3', name: 'Charlie Brown', email: 'charlie@clinic.com', latestAssessment: { crisis_flag: false, depression: { label: 'High' } } },
    ];

    function filterPatients(list, query, riskFilter) {
      return list.filter(p => {
        const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.email.toLowerCase().includes(query.toLowerCase());
        if (!matchesQuery) return false;

        if (riskFilter === 'crisis') return p.latestAssessment?.crisis_flag === true;
        if (riskFilter === 'high') return p.latestAssessment?.depression?.label === 'High';
        return true;
      });
    }

    const crisisFiltered = filterPatients(patients, '', 'crisis');
    assert.strictEqual(crisisFiltered.length, 1);
    assert.strictEqual(crisisFiltered[0].name, 'Bob Jones');

    const highFiltered = filterPatients(patients, '', 'high');
    assert.strictEqual(highFiltered.length, 2);

    const searchFiltered = filterPatients(patients, 'alice', 'all');
    assert.strictEqual(searchFiltered.length, 1);
    assert.strictEqual(searchFiltered[0].name, 'Alice Smith');
  });

  it('API-04: Connect code sanitization & case formatting', () => {
    function sanitizeConnectCode(input) {
      return (input || '').trim().toUpperCase();
    }

    assert.strictEqual(sanitizeConnectCode('dr-sarah-782'), 'DR-SARAH-782');
    assert.strictEqual(sanitizeConnectCode('  DR-JOHN-123  '), 'DR-JOHN-123');
  });
});

