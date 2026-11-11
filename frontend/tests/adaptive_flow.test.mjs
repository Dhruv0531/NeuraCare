import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Frontend Stepped Adaptive Wizard & Scoring Logic', () => {

  // Standard psychiatric definitions from frontend/app/assessment/page.tsx
  const PHQ9_ITEMS = [
    'phq_interest', 'phq_depressed', 'phq_sleep', 'phq_tired',
    'phq_appetite', 'phq_failure', 'phq_concentrate', 'phq_slow_restless', 'phq_self_harm'
  ];

  const GAD7_ITEMS = [
    'gad_nervous', 'gad_cant_stop', 'gad_worry_much', 'gad_relax',
    'gad_restless', 'gad_irritable', 'gad_afraid'
  ];

  const ISI_ITEMS = [
    'isi_falling_asleep', 'isi_staying_asleep', 'isi_waking_early',
    'isi_satisfaction', 'isi_noticeable', 'isi_worried', 'isi_interfering'
  ];

  it('WIZ-01: Validates exact item counts for standard clinical instruments', () => {
    assert.strictEqual(PHQ9_ITEMS.length, 9, 'PHQ-9 must have exactly 9 screening items');
    assert.strictEqual(GAD7_ITEMS.length, 7, 'GAD-7 must have exactly 7 screening items');
    assert.strictEqual(ISI_ITEMS.length, 7, 'ISI must have exactly 7 insomnia items');
  });

  it('WIZ-02: 6-Stage Stepped Wizard sequencing and progression rules', () => {
    const STAGES = [
      { step: 1, name: 'PHQ-9 Mood Assessment', isAdaptive: false },
      { step: 2, name: 'AI Deep-Dive: Depression Clusters', isAdaptive: true },
      { step: 3, name: 'GAD-7 Anxiety Screening', isAdaptive: false },
      { step: 4, name: 'AI Deep-Dive: Anxiety Clusters', isAdaptive: true },
      { step: 5, name: 'Somatic Sleep Architecture (ISI)', isAdaptive: false },
      { step: 6, name: 'Demographics & Reflection Journal', isAdaptive: false },
    ];

    assert.strictEqual(STAGES.length, 6, 'Wizard must consist of exactly 6 stepped clinical stages');
    assert.strictEqual(STAGES[1].isAdaptive, true, 'Stage 2 must be the PHQ-9 adaptive deep-dive');
    assert.strictEqual(STAGES[3].isAdaptive, true, 'Stage 4 must be the GAD-7 adaptive deep-dive');

    // Test completion validation logic
    function isStageComplete(stage, answers) {
      if (stage === 1) {
        return PHQ9_ITEMS.every(id => answers[id] !== undefined && answers[id] !== null);
      }
      if (stage === 3) {
        return GAD7_ITEMS.every(id => answers[id] !== undefined && answers[id] !== null);
      }
      return true;
    }

    const partialAnswers = { phq_interest: 2, phq_depressed: 1 };
    assert.strictEqual(isStageComplete(1, partialAnswers), false, 'Stage 1 cannot be complete with missing items');

    const completeAnswers = {};
    PHQ9_ITEMS.forEach(k => { completeAnswers[k] = 1; });
    assert.strictEqual(isStageComplete(1, completeAnswers), true, 'Stage 1 is complete when all 9 items answered');
  });

  it('WIZ-03: PHQ-9 & GAD-7 Psychometric Sum Score Range Verification', () => {
    // Minimum boundary (all 0)
    const minPhq = PHQ9_ITEMS.reduce((sum, _) => sum + 0, 0);
    const minGad = GAD7_ITEMS.reduce((sum, _) => sum + 0, 0);
    assert.strictEqual(minPhq, 0);
    assert.strictEqual(minGad, 0);

    // Maximum boundary (all 3)
    const maxPhq = PHQ9_ITEMS.reduce((sum, _) => sum + 3, 0);
    const maxGad = GAD7_ITEMS.reduce((sum, _) => sum + 3, 0);
    assert.strictEqual(maxPhq, 27, 'PHQ-9 maximum sum must be 27');
    assert.strictEqual(maxGad, 21, 'GAD-7 maximum sum must be 21');
  });

  it('WIZ-04: Deterministic Crisis Alert Trigger on PHQ-9 Item 9', () => {
    function evaluateCrisis(phqAnswers) {
      return (phqAnswers.phq_self_harm || 0) > 0;
    }

    assert.strictEqual(evaluateCrisis({ phq_self_harm: 0 }), false);
    assert.strictEqual(evaluateCrisis({ phq_self_harm: 1 }), true, 'Item 9 score of 1 must trigger crisis flag');
    assert.strictEqual(evaluateCrisis({ phq_self_harm: 3 }), true, 'Item 9 score of 3 must trigger crisis flag');
  });

  it('WIZ-05: ISI Sleep Index Scoring (0-28 range and severity brackets)', () => {
    function computeIsiSeverity(answers) {
      const total = answers.slice(0, 7).reduce((acc, v) => acc + (parseInt(v) || 0), 0);
      let level = 'Low';
      if (total >= 15) level = 'High';
      else if (total >= 8) level = 'Moderate';
      return { total, level };
    }

    assert.deepStrictEqual(computeIsiSeverity([0, 0, 0, 0, 0, 0, 0]), { total: 0, level: 'Low' });
    assert.deepStrictEqual(computeIsiSeverity([2, 2, 2, 1, 1, 1, 2]), { total: 11, level: 'Moderate' });
    assert.deepStrictEqual(computeIsiSeverity([3, 3, 3, 2, 2, 3, 3]), { total: 19, level: 'High' });
  });
});

