const { describe, it } = require('node:test');
const assert = require('node:assert');

// We test the logic of the stepped adaptive engine and crisis checks directly
describe('Stepped Adaptive Engine & Assessment Unit Tests', () => {

  // Test the fallback generator logic
  function generateFallbackSectionFollowups(section, answers = {}) {
    const getVal = (k) => parseInt(answers[k]) || 0;
    const SCALE = ['Not at all', 'Slightly / Several days', 'Moderately / More than half the days', 'Extremely / Nearly every day'];

    if (section === 'phq9') {
      const interest = getVal('phq_interest');
      const depressed = getVal('phq_depressed');
      const sleep = getVal('phq_sleep');
      const tired = getVal('phq_tired');
      const appetite = getVal('phq_appetite');
      const failure = getVal('phq_failure');
      const concentrate = getVal('phq_concentrate');
      const slow_restless = getVal('phq_slow_restless');
      const self_harm = getVal('phq_self_harm');

      const total_score = interest + depressed + sleep + tired + appetite + failure + concentrate + slow_restless + self_harm;
      let severity = 'Minimal';
      if (total_score >= 20) severity = 'Severe';
      else if (total_score >= 15) severity = 'Moderately Severe';
      else if (total_score >= 10) severity = 'Moderate';
      else if (total_score >= 5) severity = 'Mild';

      const somatic = sleep + tired + appetite;
      const cognitive = failure + concentrate;
      const mood = interest + depressed;

      let dominant_cluster = 'Physical Fatigue & Sleep Disruption';
      let observation = 'Physical exhaustion and disrupted sleep appear to be dominant somatic drivers.';
      let questions = [
        {
          id: 'phq_adaptive_fup_1',
          text: 'When your sleep is disrupted or you feel low energy, how difficult is it to carry out your daily work?',
          target_symptom: 'Functional impairment from somatic exhaustion',
          scale: SCALE
        }
      ];

      if (self_harm > 0) {
        dominant_cluster = 'Acute Distress & Safety Priority';
        observation = 'Signals of intense distress or self-harm thoughts require compassionate safety exploration.';
      } else if (total_score <= 4) {
        dominant_cluster = 'General Emotional Balance & Resilience';
        observation = 'Low depressive symptoms reported. Assessing protective psychological resilience.';
      } else if (cognitive >= somatic && cognitive >= mood) {
        dominant_cluster = 'Self-Criticism & Concentration Challenges';
        observation = 'Feelings of letting yourself down and cognitive focus difficulties are prominent.';
      }

      return {
        section: 'phq9',
        total_score,
        severity,
        dominant_cluster,
        observation,
        questions,
        crisis_flag: self_harm > 0
      };
    } else {
      // GAD-7 logic
      const nervous = getVal('gad_nervous');
      const cant_stop = getVal('gad_cant_stop');
      const worry_much = getVal('gad_worry_much');
      const relax = getVal('gad_relax');
      const restless = getVal('gad_restless');
      const irritable = getVal('gad_irritable');
      const afraid = getVal('gad_afraid');

      const total_score = nervous + cant_stop + worry_much + relax + restless + irritable + afraid;
      let severity = 'Minimal';
      if (total_score >= 15) severity = 'Severe';
      else if (total_score >= 10) severity = 'Moderate';
      else if (total_score >= 5) severity = 'Mild';

      const rumination = nervous + cant_stop + worry_much;
      const tension = relax + restless;
      const panic = irritable + afraid;

      let dominant_cluster = 'Uncontrollable Worry & Racing Thoughts';
      if (total_score <= 4) {
        dominant_cluster = 'Calm Demeanor & Stress Regulation';
      } else if (tension >= rumination && tension >= panic) {
        dominant_cluster = 'Physiological Restlessness & Muscle Tension';
      } else if (panic >= rumination && panic >= tension) {
        dominant_cluster = 'Anticipatory Dread & Emotional Fragility';
      }

      return {
        section: 'gad7',
        total_score,
        severity,
        dominant_cluster,
        questions: [{ id: 'gad_fup_1', text: 'Sample', scale: SCALE }]
      };
    }
  }

  it('ADP-01: PHQ-9 Somatic/Sleep Cluster Detection', () => {
    const answers = {
      phq_interest: 1, phq_depressed: 1, phq_sleep: 3, phq_tired: 3,
      phq_appetite: 2, phq_failure: 0, phq_concentrate: 0, phq_slow_restless: 0, phq_self_harm: 0
    };
    const result = generateFallbackSectionFollowups('phq9', answers);
    assert.strictEqual(result.dominant_cluster, 'Physical Fatigue & Sleep Disruption');
    assert.strictEqual(result.severity, 'Moderate');
    assert.strictEqual(result.total_score, 10);
    assert.strictEqual(result.crisis_flag, false);
  });

  it('ADP-02: PHQ-9 Acute Distress & Crisis Flag Detection', () => {
    const answers = {
      phq_interest: 2, phq_depressed: 2, phq_sleep: 1, phq_tired: 1,
      phq_appetite: 1, phq_failure: 1, phq_concentrate: 1, phq_slow_restless: 1, phq_self_harm: 2
    };
    const result = generateFallbackSectionFollowups('phq9', answers);
    assert.strictEqual(result.dominant_cluster, 'Acute Distress & Safety Priority');
    assert.strictEqual(result.crisis_flag, true);
  });

  it('ADP-03: PHQ-9 Cognitive Worth Cluster Detection', () => {
    const answers = {
      phq_interest: 0, phq_depressed: 1, phq_sleep: 0, phq_tired: 0,
      phq_appetite: 0, phq_failure: 3, phq_concentrate: 3, phq_slow_restless: 0, phq_self_harm: 0
    };
    const result = generateFallbackSectionFollowups('phq9', answers);
    assert.strictEqual(result.dominant_cluster, 'Self-Criticism & Concentration Challenges');
    assert.strictEqual(result.severity, 'Mild');
  });

  it('ADP-04: GAD-7 Metacognitive Rumination Cluster Detection', () => {
    const answers = {
      gad_nervous: 3, gad_cant_stop: 3, gad_worry_much: 2,
      gad_relax: 0, gad_restless: 0, gad_irritable: 0, gad_afraid: 0
    };
    const result = generateFallbackSectionFollowups('gad7', answers);
    assert.strictEqual(result.dominant_cluster, 'Uncontrollable Worry & Racing Thoughts');
    assert.strictEqual(result.severity, 'Mild');
    assert.strictEqual(result.total_score, 8);
  });

  it('ADP-05: GAD-7 Somatic Tension & Restlessness Cluster Detection', () => {
    const answers = {
      gad_nervous: 0, gad_cant_stop: 0, gad_worry_much: 0,
      gad_relax: 3, gad_restless: 3, gad_irritable: 0, gad_afraid: 0
    };
    const result = generateFallbackSectionFollowups('gad7', answers);
    assert.strictEqual(result.dominant_cluster, 'Physiological Restlessness & Muscle Tension');
    assert.strictEqual(result.severity, 'Mild');
    assert.strictEqual(result.total_score, 6);
  });

  it('ADP-06: Asymptomatic Profile Handling', () => {
    const phqZero = { phq_interest: 0, phq_depressed: 0, phq_sleep: 0, phq_tired: 0, phq_appetite: 0, phq_failure: 0, phq_concentrate: 0, phq_slow_restless: 0, phq_self_harm: 0 };
    const resPhq = generateFallbackSectionFollowups('phq9', phqZero);
    assert.strictEqual(resPhq.dominant_cluster, 'General Emotional Balance & Resilience');
    assert.strictEqual(resPhq.severity, 'Minimal');

    const gadZero = { gad_nervous: 0, gad_cant_stop: 0, gad_worry_much: 0, gad_relax: 0, gad_restless: 0, gad_irritable: 0, gad_afraid: 0 };
    const resGad = generateFallbackSectionFollowups('gad7', gadZero);
    assert.strictEqual(resGad.dominant_cluster, 'Calm Demeanor & Stress Regulation');
    assert.strictEqual(resGad.severity, 'Minimal');
  });
});

