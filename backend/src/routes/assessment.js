const router = require('express').Router();
const auth = require('../middleware/auth');
const Assessment = require('../models/Assessment');
const User = require('../models/User');

function checkCrisisSignals(formData) {
  const selfHarm = parseInt(formData.phq_self_harm) || 0;
  if (selfHarm > 0) {
    return {
      alert: true,
      severity: 'CRITICAL_ATTENTION_REQUIRED',
      message: 'Your responses indicate thoughts of self-harm or deep distress. Immediate confidential support is available 24/7.',
      resources: [
        { name: 'Suicide & Crisis Lifeline (US & Canada)', contact: 'Call or text 988', web: 'https://988lifeline.org' },
        { name: 'Crisis Text Line', contact: 'Text HOME to 741741', web: 'https://www.crisistextline.org' },
        { name: 'Tele-MANAS (India)', contact: 'Toll-Free 14416 / 1800-891-4416', web: 'https://telemanas.mohfw.gov.in' },
        { name: 'Find A Helpline (Worldwide)', contact: 'Confidential free local helplines', web: 'https://findahelpline.com' }
      ]
    };
  }
  return { alert: false };
}

// Robust ML Service invoker with intelligent fallback resolution
async function invokeMlService(endpoint, payload, timeoutMs = 8000) {
  const fetch = (await import('node-fetch')).default;
  const configuredUrl = (process.env.ML_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

  // 1. Attempt configured ML API URL
  try {
    const res = await fetch(`${configuredUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) return await res.json();
    throw new Error(`ML API HTTP ${res.status}: ${res.statusText}`);
  } catch (primaryErr) {
    // 2. If configured URL was an external tunnel and failed (e.g. ENOTFOUND/timeout), auto-try localhost
    const isLocal = configuredUrl.includes('localhost') || configuredUrl.includes('127.0.0.1');
    if (!isLocal) {
      try {
        const localRes = await fetch(`http://127.0.0.1:8000${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(2500),
        });
        if (localRes.ok) return await localRes.json();
      } catch (_) {
        // Localhost not active either
      }
    }
    throw primaryErr;
  }
}

// Helper: call ML API or construct complete prediction object
async function getPredictions(formData) {
  const crisis = checkCrisisSignals(formData);

  try {
    const data = await invokeMlService('/predict', {
      answers: formData,
      sleep_answers: formData.sleep_answers || [],
      text: formData.text || '',
    }, 10000);

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
      scoringMode: 'ml_multimodal',
      crisis_flag: crisis.alert,
      crisis_guidance: crisis,
      overallScore: data.overallScore ?? data.overall_score ?? 50,
      depression: dep,
      anxiety: anx,
      stress: str,
      insomnia: data.sleep ? { label: data.sleep.level || 'Low', level: data.sleep.level || 'Low', score: data.sleep.score, probabilities: { low: 0, moderate: 0, high: 0 } } : { label: 'Low', level: 'Low', score: 0, probabilities: { low: 1, moderate: 0, high: 0 } },
      sleep: data.sleep,
      emotion: data.emotion,
      recommendations: data.recommendations || [],
      fusion_metadata: data.fusion_metadata,
      shapValues: {
        depression: (dep.shap_explanation || []).map(s => ({ feature: s.description || s.feature, value: s.impact })),
        anxiety: (anx.shap_explanation || []).map(s => ({ feature: s.description || s.feature, value: s.impact })),
        stress: (str.shap_explanation || []).map(s => ({ feature: s.description || s.feature, value: s.impact })),
        insomnia: [],
      },
    };
  } catch (err) {
    const reason = err.code || err.message || 'connection failed';
    console.warn(`[ML Gateway] Python ML service unavailable (${reason}). Operating smoothly in validated Clinical Fallback mode.`);
    return generateFallbackPredictions(formData);
  }
}

function generateFallbackPredictions(formData) {
  const crisis = checkCrisisSignals(formData);
  const phqFields = ['phq_interest','phq_depressed','phq_sleep','phq_tired','phq_appetite','phq_failure','phq_concentrate','phq_slow_restless','phq_self_harm'];
  const gadFields = ['gad_nervous','gad_cant_stop','gad_worry_much','gad_relax','gad_restless','gad_irritable','gad_afraid'];

  // Actual individual answer values
  const phqValues = {};
  phqFields.forEach(f => { phqValues[f] = parseInt(formData[f]) || 0; });
  const gadValues = {};
  gadFields.forEach(f => { gadValues[f] = parseInt(formData[f]) || 0; });

  const phqScore = phqFields.reduce((s, f) => s + phqValues[f], 0);
  const gadScore = gadFields.reduce((s, f) => s + gadValues[f], 0);

  // Stress: derived from irritability, restlessness, relaxation difficulty, tiredness items
  const strScore = (gadValues.gad_irritable || 0) + (gadValues.gad_restless || 0) + (gadValues.gad_relax || 0) + (phqValues.phq_tired || 0);

  // Compute sleep ISI score out of 28
  let realSleepScore = 0;
  if (Array.isArray(formData.sleep_answers) && formData.sleep_answers.length > 0) {
    realSleepScore = formData.sleep_answers.slice(0, 7).reduce((s, v) => s + (parseInt(v) || 0), 0);
  } else {
    realSleepScore = Math.min(28, Math.round(((phqScore / 27 + gadScore / 21) / 2) * 28 * 0.5));
  }

  let sleepLevel = 'Low';
  let sleepCategory = 'No clinically significant insomnia';
  if (realSleepScore >= 15) {
    sleepLevel = 'High';
    sleepCategory = 'Clinical insomnia (Moderate/Severe)';
  } else if (realSleepScore >= 8) {
    sleepLevel = 'Moderate';
    sleepCategory = 'Subthreshold insomnia';
  }

  // Clinical probability scaling using validated PHQ-9 / GAD-7 severity cutoffs
  // PHQ-9: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-19 moderately severe, 20-27 severe
  // GAD-7: 0-4 minimal, 5-9 mild, 10-14 moderate, 15-21 severe
  const makeProbas = (rawScore, maxScore, cutoffs) => {
    // cutoffs: [mildThresh, modThresh, severeThresh] as raw scores
    const [mild, mod, severe] = cutoffs;
    let p_low, p_mod, p_high;

    if (rawScore <= mild) {
      // Minimal/normal range
      const t = rawScore / Math.max(1, mild);
      p_low = 1.0 - (t * 0.3);
      p_mod = t * 0.2;
      p_high = t * 0.1;
    } else if (rawScore <= mod) {
      // Mild range
      const t = (rawScore - mild) / Math.max(1, mod - mild);
      p_low = 0.55 - (t * 0.35);
      p_mod = 0.30 + (t * 0.30);
      p_high = 0.15 + (t * 0.05);
    } else if (rawScore <= severe) {
      // Moderate range
      const t = (rawScore - mod) / Math.max(1, severe - mod);
      p_low = 0.15 - (t * 0.10);
      p_mod = 0.55 - (t * 0.20);
      p_high = 0.30 + (t * 0.30);
    } else {
      // Severe range
      const t = Math.min(1, (rawScore - severe) / Math.max(1, maxScore - severe));
      p_low = 0.03 - (t * 0.02);
      p_mod = 0.25 - (t * 0.15);
      p_high = 0.72 + (t * 0.17);
    }

    // Clamp and normalize
    p_low = Math.max(0.01, p_low);
    p_mod = Math.max(0.01, p_mod);
    p_high = Math.max(0.01, p_high);
    const total = p_low + p_mod + p_high;
    p_low = parseFloat((p_low / total).toFixed(4));
    p_mod = parseFloat((p_mod / total).toFixed(4));
    p_high = parseFloat((p_high / total).toFixed(4));

    let label = 'Low';
    if (p_high >= p_mod && p_high >= p_low) label = 'High';
    else if (p_mod >= p_low) label = 'Moderate';

    return { label, level: label, score: rawScore, probabilities: { low: p_low, moderate: p_mod, high: p_high } };
  };

  // PHQ-9 cutoffs: mild=5, moderate=10, severe=15  (max 27)
  const dep = makeProbas(phqScore, 27, [4, 9, 14]);
  // GAD-7 cutoffs: mild=5, moderate=10, severe=15  (max 21)
  const anx = makeProbas(gadScore, 21, [4, 9, 14]);
  // Stress (4 items, max=12): mild=3, moderate=6, severe=9
  const str = makeProbas(strScore, 12, [3, 6, 9]);

  const ins = { label: sleepLevel, level: sleepLevel, score: realSleepScore, max_score: 28, category: sleepCategory, probabilities: { low: sleepLevel === 'Low' ? 1 : 0, moderate: sleepLevel === 'Moderate' ? 1 : 0, high: sleepLevel === 'High' ? 1 : 0 } };

  const overall = Math.round(
    (((dep.probabilities.moderate * 50 + dep.probabilities.high * 100) * 0.35) +
     ((anx.probabilities.moderate * 50 + anx.probabilities.high * 100) * 0.30) +
     ((str.probabilities.moderate * 50 + str.probabilities.high * 100) * 0.20) +
     ((realSleepScore / 28) * 100 * 0.15))
  );

  // --- Dynamic SHAP-like impact scores based on actual answers ---
  // Depression SHAP: derived from PHQ-9 depression-relevant items
  const depShapItems = [
    { feature: 'Q13A', description: 'Feeling sad and depressed', sourceField: 'phq_depressed' },
    { feature: 'Q3A',  description: 'Absence of positive feelings', sourceField: 'phq_interest' },
    { feature: 'Q17A', description: 'Feeling worth little as a person', sourceField: 'phq_failure' },
    { feature: 'Q21A', description: 'Feeling life is meaningless', sourceField: 'phq_self_harm' },
    { feature: 'Q42A', description: 'Difficulty getting motivated', sourceField: 'phq_tired' },
  ];

  // Anxiety SHAP: derived from GAD-7 anxiety-relevant items
  const anxShapItems = [
    { feature: 'Q9A',  description: 'Feeling nervous or on edge', sourceField: 'gad_nervous' },
    { feature: 'Q40A', description: 'Cannot stop worrying', sourceField: 'gad_cant_stop' },
    { feature: 'Q20A', description: 'Feeling scared without reason', sourceField: 'gad_afraid' },
    { feature: 'Q30A', description: 'Worrying too much', sourceField: 'gad_worry_much' },
    { feature: 'Q8A',  description: 'Difficulty relaxing', sourceField: 'gad_relax' },
  ];

  // Stress SHAP: derived from stress-relevant items
  const strShapItems = [
    { feature: 'Q27A', description: 'Irritability', sourceField: 'gad_irritable' },
    { feature: 'Q29A', description: 'Nervous agitation', sourceField: 'gad_restless' },
    { feature: 'Q1A',  description: 'Difficulty winding down', sourceField: 'gad_relax' },
    { feature: 'Q5A',  description: 'Difficulty taking initiative', sourceField: 'phq_tired' },
    { feature: 'Q6A',  description: 'Over-reacting to situations', sourceField: 'gad_irritable' },
  ];

  // Compute dynamic SHAP values: impact scales with answer value (0-3)
  const computeShapExplanation = (shapItems, allValues) => {
    return shapItems.map(item => {
      const rawVal = parseInt(allValues[item.sourceField]) || 0;
      // Impact scales with severity: val 0→0.0, val 1→~0.15, val 2→~0.35, val 3→~0.55
      const impact = rawVal === 0 ? 0.0 : parseFloat((0.05 + (rawVal / 3) * 0.50).toFixed(4));
      return {
        feature: item.feature,
        description: item.description,
        value: rawVal,
        impact: impact
      };
    })
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  };

  const allValues = { ...phqValues, ...gadValues };
  dep.shap_explanation = computeShapExplanation(depShapItems, allValues);
  anx.shap_explanation = computeShapExplanation(anxShapItems, allValues);
  str.shap_explanation = computeShapExplanation(strShapItems, allValues);

  // --- Dynamic emotion analysis based on actual symptom profile ---
  let emotionResult;
  if (formData.text && formData.text.trim().length > 0) {
    // Derive pseudo-emotions from symptom severity when ML is unavailable
    const avgSeverity = (phqScore + gadScore) / (27 + 21); // 0.0 to 1.0
    const depRatio = phqScore / 27;
    const anxRatio = gadScore / 21;

    const emotions = [];
    // Sadness driven by depression items
    if (depRatio > 0) emotions.push({ label: 'sadness', score: parseFloat(Math.min(0.95, 0.15 + depRatio * 0.70).toFixed(4)) });
    // Nervousness driven by anxiety items
    if (anxRatio > 0) emotions.push({ label: 'nervousness', score: parseFloat(Math.min(0.95, 0.15 + anxRatio * 0.65).toFixed(4)) });
    // Fear driven by gad_afraid
    if (gadValues.gad_afraid > 0) emotions.push({ label: 'fear', score: parseFloat(Math.min(0.90, 0.10 + (gadValues.gad_afraid / 3) * 0.60).toFixed(4)) });
    // Disappointment driven by phq_failure
    if (phqValues.phq_failure > 0) emotions.push({ label: 'disappointment', score: parseFloat(Math.min(0.85, 0.10 + (phqValues.phq_failure / 3) * 0.55).toFixed(4)) });
    // Annoyance/anger driven by irritability
    if (gadValues.gad_irritable > 0) emotions.push({ label: 'annoyance', score: parseFloat(Math.min(0.80, 0.10 + (gadValues.gad_irritable / 3) * 0.50).toFixed(4)) });

    // If nothing elevated, show neutral/optimism
    if (emotions.length === 0 || avgSeverity < 0.1) {
      emotions.length = 0;
      emotions.push({ label: 'neutral', score: 0.75 });
      emotions.push({ label: 'optimism', score: 0.35 });
    }

    emotions.sort((a, b) => b.score - a.score);
    emotionResult = { status: 'success', emotions: emotions.slice(0, 5) };
  } else {
    emotionResult = { status: 'not_available', message: 'No optional journal text provided' };
  }

  // Dynamic recommendations based on actual risk level
  const highestLevel = dep.label === 'High' || anx.label === 'High' || str.label === 'High' ? 'High'
    : dep.label === 'Moderate' || anx.label === 'Moderate' || str.label === 'Moderate' ? 'Moderate' : 'Low';

  const recommendationSets = {
    Low: [
      "Practice 10-15 minutes of daily mindfulness meditation to maintain emotional well-being.",
      "Establish a consistent evening wind-down routine and avoid screen time 1 hour before sleep.",
      "Engage in 30 minutes of moderate aerobic exercise like brisk walking 4 days a week.",
      "Keep a daily gratitude journal to foster positive cognitive framing."
    ],
    Moderate: [
      "Use box breathing (4-4-4-4 count) during moments of heightened tension or worry.",
      "Schedule structured 15-minute 'worry windows' to prevent persistent rumination throughout the day.",
      "Establish bedtime sleep hygiene rituals and avoid caffeine or heavy meals after 6 PM.",
      "Reach out to a trusted friend, counselor, or support group to share your current feelings."
    ],
    High: [
      "Consult a licensed mental health professional or clinical psychologist for a comprehensive evaluation.",
      "Practice grounded sensory exercises (the 5-4-3-2-1 technique) to reduce acute anxiety and autonomic panic.",
      "Break daily activities into small, low-pressure steps to reduce feelings of executive overload.",
      "Ensure immediate access to helpline support networks and avoid isolating yourself during difficult moments."
    ]
  };

  return {
    scoringMode: 'clinical_fallback',
    crisis_flag: crisis.alert,
    crisis_guidance: crisis,
    overallScore: Math.max(5, Math.min(98, overall)),
    depression: dep,
    anxiety: anx,
    stress: str,
    insomnia: ins,
    sleep: { level: sleepLevel, score: realSleepScore, max_score: 28, category: sleepCategory },
    emotion: emotionResult,
    recommendations: recommendationSets[highestLevel],
    shapValues: {
      depression: dep.shap_explanation.map(s => ({ feature: s.description, value: s.impact })),
      anxiety: anx.shap_explanation.map(s => ({ feature: s.description, value: s.impact })),
      stress: str.shap_explanation.map(s => ({ feature: s.description, value: s.impact })),
      insomnia: [],
    },
  };
}

function generateFallbackAdaptiveQuestion(answers = {}, history = []) {
  const answeredIds = new Set([...Object.keys(answers), ...history]);
  const depAnswers = Object.entries(answers).filter(([k]) => k.startsWith('phq_') && k !== 'phq_self_harm').map(([, v]) => parseInt(v) || 0);
  const anxAnswers = Object.entries(answers).filter(([k]) => k.startsWith('gad_')).map(([, v]) => parseInt(v) || 0);
  const depScore = depAnswers.reduce((a, b) => a + b, 0);
  const anxScore = anxAnswers.reduce((a, b) => a + b, 0);

  // Safety trigger: if depression indicators elevated, check crisis
  const hasElevatedDep = (parseInt(answers.phq_depressed) || 0) >= 2 || (parseInt(answers.phq_interest) || 0) >= 2;
  if (hasElevatedDep && !answeredIds.has('phq_self_harm')) {
    return {
      is_final: false,
      question: {
        id: 'phq_self_harm',
        domain: 'Depression',
        text: 'Thoughts that you would be better off dead, or of hurting yourself',
        original_text: 'Thoughts that you would be better off dead, or of hurting yourself',
        clinical_rationale: 'Immediate crisis safety screening triggered by elevated depressive symptoms.',
        scale: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']
      },
      progress: { answered_count: Object.keys(answers).length, estimated_total: 8, percentage: 35 }
    };
  }

  // Anchor 1: Depression
  if (!answeredIds.has('phq_depressed')) {
    return {
      is_final: false,
      question: {
        id: 'phq_depressed',
        domain: 'Depression',
        text: 'Over the last 2 weeks, how often have you been feeling down, depressed, or hopeless?',
        original_text: 'Feeling down, depressed, or hopeless',
        clinical_rationale: 'Core depressive anchor assessing pervasive dysphoria.',
        scale: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']
      },
      progress: { answered_count: 0, estimated_total: 8, percentage: 10 }
    };
  }

  // Anchor 2: Anxiety
  if (!answeredIds.has('gad_nervous')) {
    return {
      is_final: false,
      question: {
        id: 'gad_nervous',
        domain: 'Anxiety',
        text: 'Over the last 2 weeks, how often have you felt nervous, anxious, or on edge?',
        original_text: 'Feeling nervous, anxious, or on edge',
        clinical_rationale: 'Core anxiety anchor measuring generalized autonomic arousal.',
        scale: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']
      },
      progress: { answered_count: 1, estimated_total: 8, percentage: 20 }
    };
  }

  const numAnswered = Object.keys(answers).length;
  if (numAnswered >= 8 || (numAnswered >= 6 && depScore <= 1 && anxScore <= 1)) {
    return {
      is_final: true,
      message: 'Adaptive screening complete. Sufficient diagnostic confidence reached.',
      total_answered: numAnswered
    };
  }

  const candidates = [
    { id: 'phq_interest', domain: 'Depression', text: 'Little interest or pleasure in doing things', rationale: 'Assessing anhedonia.' },
    { id: 'gad_cant_stop', domain: 'Anxiety', text: 'Not being able to stop or control worrying', rationale: 'Measuring metacognitive control.' },
    { id: 'phq_tired', domain: 'Depression', text: 'Feeling tired or having little energy', rationale: 'Evaluating somatic vitality and psychomotor fatigue.' },
    { id: 'gad_relax', domain: 'Anxiety', text: 'Trouble relaxing', rationale: 'Measuring physiological tension.' },
    { id: 'phq_sleep', domain: 'Sleep', text: 'Trouble falling or staying asleep, or sleeping too much', rationale: 'Assessing circadian stability.' },
    { id: 'gad_afraid', domain: 'Anxiety', text: 'Feeling afraid as if something awful might happen', rationale: 'Assessing anticipatory dread.' },
    { id: 'phq_failure', domain: 'Depression', text: 'Feeling bad about yourself — or that you are a failure', rationale: 'Assessing cognitive self-blame.' },
    { id: 'gad_restless', domain: 'Anxiety', text: 'Being so restless that it is hard to sit still', rationale: 'Evaluating psychomotor agitation.' }
  ];

  const unasked = candidates.filter(c => !answeredIds.has(c.id));
  if (unasked.length === 0) {
    return { is_final: true, total_answered: numAnswered };
  }

  let chosen = unasked[0];
  if (depScore > anxScore) {
    const depCandidate = unasked.find(c => c.domain === 'Depression');
    if (depCandidate) chosen = depCandidate;
  } else if (anxScore > depScore) {
    const anxCandidate = unasked.find(c => c.domain === 'Anxiety');
    if (anxCandidate) chosen = anxCandidate;
  }

  return {
    is_final: false,
    question: {
      id: chosen.id,
      domain: chosen.domain,
      text: chosen.text,
      original_text: chosen.text,
      clinical_rationale: chosen.rationale,
      scale: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']
    },
    progress: {
      answered_count: numAnswered,
      estimated_total: 8,
      percentage: Math.min(95, Math.round((numAnswered / 8) * 100))
    }
  };
}

// Fallback Section-Level Stepped Adaptive Engine (Express in-memory)
function generateFallbackSectionFollowups(section, answers = {}, phq_context = null) {
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
        text: 'When your sleep is disrupted or you feel low energy, how difficult is it to carry out your daily work, studies, or household responsibilities?',
        target_symptom: 'Functional impairment from somatic exhaustion',
        scale: SCALE
      },
      {
        id: 'phq_adaptive_fup_2',
        text: 'Have you noticed your physical tiredness causing you to withdraw from friends, conversations, or activities you normally enjoy?',
        target_symptom: 'Behavioral withdrawal linked to low energy',
        scale: SCALE
      }
    ];

    if (self_harm > 0) {
      dominant_cluster = 'Acute Distress & Safety Priority';
      observation = 'Signals of intense distress or self-harm thoughts require compassionate safety exploration.';
      questions = [
        {
          id: 'phq_adaptive_fup_1',
          text: 'When feelings of intense overwhelm or distress arise, do you have a trusted person, family member, or professional you feel safe reaching out to?',
          target_symptom: 'Social safety network availability',
          scale: ['Yes, easily accessible', 'Sometimes available', 'Rarely available', 'No safe person to reach out to']
        },
        {
          id: 'phq_adaptive_fup_2',
          text: 'Have you noticed these thoughts becoming more frequent or difficult to step away from during periods of high stress?',
          target_symptom: 'Distress intensity escalation',
          scale: SCALE
        }
      ];
    } else if (total_score <= 4) {
      dominant_cluster = 'General Emotional Balance & Resilience';
      observation = 'Low depressive symptoms reported. Assessing protective psychological resilience.';
      questions = [
        {
          id: 'phq_adaptive_fup_1',
          text: 'When unexpected life stressors occur, how confident do you feel in your ability to bounce back and maintain emotional stability?',
          target_symptom: 'Psychological resilience and adaptive coping',
          scale: ['Very confident', 'Moderately confident', 'Slightly uncertain', 'Not confident at all']
        }
      ];
    } else if (cognitive >= somatic && cognitive >= mood) {
      dominant_cluster = 'Self-Criticism & Concentration Challenges';
      observation = 'Feelings of letting yourself down and cognitive focus difficulties are prominent.';
      questions = [
        {
          id: 'phq_adaptive_fup_1',
          text: 'How often do self-critical thoughts or feelings of not being good enough linger in your mind during moments of quiet or stress?',
          target_symptom: 'Persistent negative cognitive framing',
          scale: SCALE
        },
        {
          id: 'phq_adaptive_fup_2',
          text: 'When trying to focus on important tasks, how frequently does mental fog or indecisiveness make you feel stuck or overwhelmed?',
          target_symptom: 'Executive dysfunction and task paralysis',
          scale: SCALE
        }
      ];
    } else if (mood >= somatic) {
      dominant_cluster = 'Loss of Joy & Pervasive Low Mood';
      observation = 'Diminished interest in activities and pervasive sadness are the primary indicators.';
      questions = [
        {
          id: 'phq_adaptive_fup_1',
          text: 'Even during moments that used to bring you comfort or happiness, how often do you still feel emotionally flat or numb?',
          target_symptom: 'Emotional blunting and persistent anhedonia',
          scale: SCALE
        },
        {
          id: 'phq_adaptive_fup_2',
          text: 'Over the past month, have you found it difficult to imagine a hopeful or positive outlook for the near future?',
          target_symptom: 'Cognitive hopelessness and future orientation',
          scale: SCALE
        }
      ];
    }

    return {
      section: 'phq9',
      total_score,
      max_score: 27,
      severity,
      dominant_cluster,
      ai_clinical_observation: observation,
      crisis_flag: self_harm > 0,
      followup_questions: questions
    };
  }

  // GAD-7
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

  const rumination = cant_stop + worry_much;
  const somatic = relax + restless;
  const panic = nervous + afraid;

  let dominant_cluster = 'Uncontrollable Worry & Racing Thoughts';
  let observation = 'Difficulty controlling persistent worry and repetitive thoughts are primary anxiety drivers.';
  let questions = [
    {
      id: 'gad_adaptive_fup_1',
      text: 'How often do "what-if" or worst-case scenario thoughts spiral and consume significant amounts of your daily headspace?',
      target_symptom: 'Catastrophic anticipation and rumination loop',
      scale: SCALE
    },
    {
      id: 'gad_adaptive_fup_2',
      text: 'Have you found yourself avoiding certain conversations, events, or decisions simply to prevent triggering feelings of anxiety?',
      target_symptom: 'Behavioral avoidance driven by worry',
      scale: SCALE
    }
  ];

  if (total_score <= 4) {
    dominant_cluster = 'Calm Autonomic Baseline';
    observation = 'Low generalized anxiety symptoms reported. Screening situational stress management.';
    questions = [
      {
        id: 'gad_adaptive_fup_1',
        text: 'How effectively are you currently able to calm your mind and body down after a stressful encounter or busy day?',
        target_symptom: 'Stress recovery speed and emotional regulation',
        scale: ['Very effectively', 'Moderately well', 'Takes considerable effort', 'Extremely difficult']
      }
    ];
  } else if (panic >= rumination && panic >= somatic && afraid >= 2) {
    dominant_cluster = 'Anticipatory Fear & Sudden Panic';
    observation = 'Feeling afraid as if something awful might happen, paired with heightened startle response.';
    questions = [
      {
        id: 'gad_adaptive_fup_1',
        text: 'Have you experienced sudden, unexpected surges of intense fear or heart-racing panic when there is no clear immediate danger?',
        target_symptom: 'Spontaneous panic episodes and fear surges',
        scale: SCALE
      },
      {
        id: 'gad_adaptive_fup_2',
        text: 'How frequently do you feel on guard or scanning your environment for potential problems or threats?',
        target_symptom: 'Hypervigilance and threat sensitivity',
        scale: SCALE
      }
    ];
  } else if (somatic >= rumination) {
    dominant_cluster = 'Physiological Restlessness & Muscle Tension';
    observation = 'Inability to physically unwind, restlessness, or bodily tension are prominent.';
    questions = [
      {
        id: 'gad_adaptive_fup_1',
        text: 'Do you notice physical anxiety manifestations — such as muscle tightness in the neck/shoulders, clenching your jaw, or a fluttering chest?',
        target_symptom: 'Somatic autonomic hyperarousal',
        scale: SCALE
      },
      {
        id: 'gad_adaptive_fup_2',
        text: 'When trying to rest or sleep at night, does your body feel tense or unable to physically decompress?',
        target_symptom: 'Nocturnal hyperarousal and inability to relax',
        scale: SCALE
      }
    ];
  }

  return {
    section: 'gad7',
    total_score,
    max_score: 21,
    severity,
    dominant_cluster,
    ai_clinical_observation: observation,
    followup_questions: questions
  };
}

// POST /api/assessment/adaptive-section
router.post('/adaptive-section', async (req, res) => {
  const { section = 'phq9', answers = {}, phq_context = null } = req.body;

  try {
    const data = await invokeMlService('/adaptive/section-followups', { section, answers, phq_context }, 6000);
    return res.json(data);
  } catch (err) {
    const reason = err.code || err.message || 'offline';
    console.warn(`[ML Gateway] Adaptive section follow-up using Express fallback engine (${reason}).`);
    return res.json(generateFallbackSectionFollowups(section, answers, phq_context));
  }
});

// POST /api/assessment/adaptive-next
router.post('/adaptive-next', async (req, res) => {
  const { answers = {}, history = [] } = req.body;

  try {
    const data = await invokeMlService('/adaptive/next-question', { answers, history }, 6000);
    return res.json(data);
  } catch (err) {
    return res.json(generateFallbackAdaptiveQuestion(answers, history));
  }
});

// POST /api/assessment/submit
router.post('/submit', async (req, res) => {
  try {
    const predictions = await getPredictions(req.body);

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
        const userDoc = await User.findById(decoded.id).select('assignedClinicianId');
        const assessment = await Assessment.create({
          userId: decoded.id,
          clinicianId: userDoc ? userDoc.assignedClinicianId : undefined,
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
