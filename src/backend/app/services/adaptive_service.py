import os
import json
import urllib.request
import urllib.error
from typing import Dict, List, Any, Optional

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free")

SCALE_4_SEVERITY = ['Not at all', 'Slightly / Several days', 'Moderately / More than half the days', 'Extremely / Nearly every day']

# ─── Clinically Curated Fallback Templates by Symptom Cluster ──────────────
FALLBACK_PHQ_CLUSTERS = {
    "somatic": {
        "label": "Physical Fatigue & Sleep Disruption",
        "description": "Physical exhaustion and disrupted sleep appear to be dominant somatic drivers.",
        "questions": [
            {
                "id": "phq_fup_somatic_1",
                "text": "When your sleep is disrupted or you feel low energy, how difficult is it to carry out your daily work, studies, or household responsibilities?",
                "target_symptom": "Functional impairment from somatic exhaustion",
                "scale": SCALE_4_SEVERITY
            },
            {
                "id": "phq_fup_somatic_2",
                "text": "Have you noticed your physical tiredness causing you to withdraw from friends, conversations, or activities you normally enjoy?",
                "target_symptom": "Behavioral withdrawal linked to low energy",
                "scale": SCALE_4_SEVERITY
            }
        ]
    },
    "cognitive": {
        "label": "Self-Criticism & Concentration Challenges",
        "description": "Feelings of letting yourself down and cognitive focus difficulties are prominent.",
        "questions": [
            {
                "id": "phq_fup_cog_1",
                "text": "How often do self-critical thoughts or feelings of not being good enough linger in your mind during moments of quiet or stress?",
                "target_symptom": "Persistent negative cognitive framing",
                "scale": SCALE_4_SEVERITY
            },
            {
                "id": "phq_fup_cog_2",
                "text": "When trying to focus on important tasks, how frequently does mental fog or indecisiveness make you feel stuck or overwhelmed?",
                "target_symptom": "Executive dysfunction and task paralysis",
                "scale": SCALE_4_SEVERITY
            }
        ]
    },
    "anhedonia": {
        "label": "Loss of Joy & Pervasive Low Mood",
        "description": "Diminished interest in activities and pervasive sadness are the primary indicators.",
        "questions": [
            {
                "id": "phq_fup_mood_1",
                "text": "Even during moments that used to bring you comfort or happiness, how often do you still feel emotionally flat or numb?",
                "target_symptom": "Emotional blunting and persistent anhedonia",
                "scale": SCALE_4_SEVERITY
            },
            {
                "id": "phq_fup_mood_2",
                "text": "Over the past month, have you found it difficult to imagine a hopeful or positive outlook for the near future?",
                "target_symptom": "Cognitive hopelessness and future orientation",
                "scale": SCALE_4_SEVERITY
            }
        ]
    },
    "crisis": {
        "label": "Acute Distress & Safety Priority",
        "description": "Signals of intense distress or self-harm thoughts require compassionate safety exploration.",
        "questions": [
            {
                "id": "phq_fup_crisis_1",
                "text": "When feelings of intense overwhelm or distress arise, do you have a trusted person, family member, or professional you feel safe reaching out to?",
                "target_symptom": "Social safety network availability",
                "scale": ["Yes, easily accessible", "Sometimes available", "Rarely available", "No safe person to reach out to"]
            },
            {
                "id": "phq_fup_crisis_2",
                "text": "Have you noticed these thoughts becoming more frequent or difficult to step away from during periods of high stress?",
                "target_symptom": "Distress intensity escalation",
                "scale": SCALE_4_SEVERITY
            }
        ]
    },
    "minimal": {
        "label": "General Emotional Balance & Resilience",
        "description": "Low depressive symptoms reported. Assessing protective psychological resilience.",
        "questions": [
            {
                "id": "phq_fup_min_1",
                "text": "When unexpected life stressors occur, how confident do you feel in your ability to bounce back and maintain emotional stability?",
                "target_symptom": "Psychological resilience and adaptive coping",
                "scale": ["Very confident", "Moderately confident", "Slightly uncertain", "Not confident at all"]
            }
        ]
    }
}

FALLBACK_GAD_CLUSTERS = {
    "rumination": {
        "label": "Uncontrollable Worry & Racing Thoughts",
        "description": "Difficulty controlling persistent worry and repetitive thoughts are primary anxiety drivers.",
        "questions": [
            {
                "id": "gad_fup_rum_1",
                "text": "How often do 'what-if' or worst-case scenario thoughts spiral and consume significant amounts of your daily headspace?",
                "target_symptom": "Catastrophic anticipation and rumination loop",
                "scale": SCALE_4_SEVERITY
            },
            {
                "id": "gad_fup_rum_2",
                "text": "Have you found yourself avoiding certain conversations, events, or decisions simply to prevent triggering feelings of anxiety?",
                "target_symptom": "Behavioral avoidance driven by worry",
                "scale": SCALE_4_SEVERITY
            }
        ]
    },
    "somatic_tension": {
        "label": "Physiological Restlessness & Muscle Tension",
        "description": "Inability to physically unwind, restlessness, or bodily tension are prominent.",
        "questions": [
            {
                "id": "gad_fup_som_1",
                "text": "Do you notice physical anxiety manifestations — such as muscle tightness in the neck/shoulders, clenching your jaw, or a fluttering chest?",
                "target_symptom": "Somatic autonomic nervous system hyperarousal",
                "scale": SCALE_4_SEVERITY
            },
            {
                "id": "gad_fup_som_2",
                "text": "When trying to rest or sleep at night, does your body feel tense or unable to physically decompress?",
                "target_symptom": "Nocturnal hyperarousal and inability to relax",
                "scale": SCALE_4_SEVERITY
            }
        ]
    },
    "panic_dread": {
        "label": "Anticipatory Fear & Sudden Panic",
        "description": "Feeling afraid as if something awful might happen, paired with heightened startle response.",
        "questions": [
            {
                "id": "gad_fup_panic_1",
                "text": "Have you experienced sudden, unexpected surges of intense fear or heart-racing panic when there is no clear immediate danger?",
                "target_symptom": "Spontaneous panic episodes and fear surges",
                "scale": SCALE_4_SEVERITY
            },
            {
                "id": "gad_fup_panic_2",
                "text": "How frequently do you feel on guard or scanning your environment for potential problems or threats?",
                "target_symptom": "Hypervigilance and threat sensitivity",
                "scale": SCALE_4_SEVERITY
            }
        ]
    },
    "irritability": {
        "label": "Emotional Reactivity & Overstimulation",
        "description": "Heightened irritability and easily triggered annoyance under daily demands.",
        "questions": [
            {
                "id": "gad_fup_irr_1",
                "text": "When multiple demands happen at once, how quickly does feeling overwhelmed turn into frustration or snapping at others?",
                "target_symptom": "Sensory and cognitive overload threshold",
                "scale": SCALE_4_SEVERITY
            }
        ]
    },
    "minimal": {
        "label": "Calm Autonomic Baseline",
        "description": "Low generalized anxiety symptoms reported. Screening situational stress management.",
        "questions": [
            {
                "id": "gad_fup_min_1",
                "text": "How effectively are you currently able to calm your mind and body down after a stressful encounter or busy day?",
                "target_symptom": "Stress recovery speed and emotional regulation",
                "scale": ["Very effectively", "Moderately well", "Takes considerable effort", "Extremely difficult"]
            }
        ]
    }
}


def _call_openrouter_for_questions(system_context: str, user_prompt: str) -> Optional[List[Dict[str, Any]]]:
    """
    Calls OpenRouter LLM to generate 1-2 empathetic, highly personalized follow-up questions
    grounded in clinical psychology.
    """
    api_key = os.getenv("OPENROUTER_API_KEY", OPENROUTER_API_KEY)
    model = os.getenv("OPENROUTER_MODEL", OPENROUTER_MODEL)

    if not api_key:
        return None

    candidate_models = [model, "meta-llama/llama-3.3-70b-instruct:free", "liquid/lfm-2.5-2.6b:free"]
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neuracare.ai",
        "X-Title": "NeuraCare Stepped Adaptive Assessment"
    }

    prompt = f"""{system_context}

{user_prompt}

Output format: Return ONLY a valid JSON array of question objects, with this exact schema:
[
  {{
    "id": "fup_1",
    "text": "Empathetic question text directly addressing the user's reported symptoms?",
    "target_symptom": "Brief clinical rationale / construct",
    "scale": ["Not at all", "Slightly", "Moderately", "Extremely"]
  }}
]
Rules:
1. Max 2 questions total.
2. Natural, compassionate, and conversational tone.
3. Measurable on the 4-point severity scale provided.
4. No diagnosis or medical advice. Return valid JSON only.
"""

    for m in candidate_models:
        if not m:
            continue
        try:
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                data=json.dumps({
                    "model": m,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 300,
                    "temperature": 0.4
                }).encode("utf-8")
            )
            with urllib.request.urlopen(req, timeout=6) as response:
                result = json.loads(response.read().decode("utf-8"))
                content = result["choices"][0]["message"]["content"].strip()
                # Clean markdown backticks if present
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                content = content.strip()
                parsed = json.loads(content)
                if isinstance(parsed, list) and len(parsed) > 0 and "text" in parsed[0]:
                    return parsed[:2]
        except Exception as e:
            print(f"OpenRouter adaptive generation error with model {m}: {e}")

    return None


class SteppedAdaptiveEngine:
    """
    Section-Level (Two-Stage / Stepped) Adaptive Assessment Engine.
    Analyzes the complete response profile of a standard clinical section (PHQ-9 or GAD-7)
    and dynamically generates targeted deep-dive follow-up questions tailored to that user's
    exact symptom distribution.
    """

    def analyze_phq9_and_generate_followups(self, answers: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes full 9-item PHQ response set and generates tailored clinical follow-up probes.
        """
        def get_val(key):
            try:
                return int(answers.get(key, 0))
            except (ValueError, TypeError):
                return 0

        interest = get_val("phq_interest")
        depressed = get_val("phq_depressed")
        sleep = get_val("phq_sleep")
        tired = get_val("phq_tired")
        appetite = get_val("phq_appetite")
        failure = get_val("phq_failure")
        concentrate = get_val("phq_concentrate")
        slow_restless = get_val("phq_slow_restless")
        self_harm = get_val("phq_self_harm")

        total_score = sum([interest, depressed, sleep, tired, appetite, failure, concentrate, slow_restless, self_harm])

        # Severity cutoffs
        if total_score <= 4:
            severity = "Minimal"
        elif total_score <= 9:
            severity = "Mild"
        elif total_score <= 14:
            severity = "Moderate"
        elif total_score <= 19:
            severity = "Moderately Severe"
        else:
            severity = "Severe"

        # Cluster scores
        somatic_score = sleep + tired + appetite
        cognitive_score = failure + concentrate
        mood_score = interest + depressed

        # Determine dominant cluster
        if self_harm > 0:
            cluster_key = "crisis"
        elif total_score <= 4:
            cluster_key = "minimal"
        elif somatic_score >= cognitive_score and somatic_score >= mood_score:
            cluster_key = "somatic"
        elif cognitive_score >= mood_score:
            cluster_key = "cognitive"
        else:
            cluster_key = "anhedonia"

        fallback_info = FALLBACK_PHQ_CLUSTERS[cluster_key]

        # Try generating customized LLM questions
        system_ctx = "You are NeuraCare AI, an empathetic clinical psychologist."
        user_prompt = f"""The patient completed the PHQ-9 depression screening with a score of {total_score}/27 ({severity} depression).
Specific item scores (0=Not at all, 3=Nearly every day):
- Depressed mood: {depressed}/3
- Anhedonia (lack of interest): {interest}/3
- Sleep disturbance: {sleep}/3
- Physical tiredness/fatigue: {tired}/3
- Appetite changes: {appetite}/3
- Guilt/feeling like a failure: {failure}/3
- Concentration problems: {concentrate}/3
- Motor restlessness/slowness: {slow_restless}/3
- Self-harm/passive thoughts: {self_harm}/3

Dominant symptom cluster identified: {fallback_info['label']}.
Generate 2 compassionate follow-up questions exploring functional impairment, emotional impact, or coping resources specifically tailored to their elevated symptoms."""

        llm_questions = _call_openrouter_for_questions(system_ctx, user_prompt)
        final_questions = llm_questions if llm_questions else fallback_info["questions"]

        # Ensure unique IDs and scales
        for i, q in enumerate(final_questions):
            q["id"] = f"phq_adaptive_fup_{i+1}"
            if "scale" not in q or not isinstance(q["scale"], list):
                q["scale"] = SCALE_4_SEVERITY

        return {
            "section": "phq9",
            "total_score": total_score,
            "max_score": 27,
            "severity": severity,
            "dominant_cluster": fallback_info["label"],
            "ai_clinical_observation": fallback_info["description"],
            "crisis_flag": self_harm > 0,
            "followup_questions": final_questions
        }

    def analyze_gad7_and_generate_followups(self, answers: Dict[str, Any], phq_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Analyzes full 7-item GAD response set and generates tailored clinical follow-up probes.
        """
        def get_val(key):
            try:
                return int(answers.get(key, 0))
            except (ValueError, TypeError):
                return 0

        nervous = get_val("gad_nervous")
        cant_stop = get_val("gad_cant_stop")
        worry_much = get_val("gad_worry_much")
        relax = get_val("gad_relax")
        restless = get_val("gad_restless")
        irritable = get_val("gad_irritable")
        afraid = get_val("gad_afraid")

        total_score = sum([nervous, cant_stop, worry_much, relax, restless, irritable, afraid])

        if total_score <= 4:
            severity = "Minimal"
        elif total_score <= 9:
            severity = "Mild"
        elif total_score <= 14:
            severity = "Moderate"
        else:
            severity = "Severe"

        rumination_score = cant_stop + worry_much
        somatic_score = relax + restless
        panic_score = nervous + afraid
        irritability_score = irritable

        if total_score <= 4:
            cluster_key = "minimal"
        elif panic_score >= rumination_score and panic_score >= somatic_score and afraid >= 2:
            cluster_key = "panic_dread"
        elif rumination_score >= somatic_score and rumination_score >= irritability_score:
            cluster_key = "rumination"
        elif somatic_score >= irritability_score:
            cluster_key = "somatic_tension"
        else:
            cluster_key = "irritability"

        fallback_info = FALLBACK_GAD_CLUSTERS[cluster_key]

        phq_summary = ""
        if phq_context:
            phq_summary = f"Prior PHQ-9 summary: Score {phq_context.get('total_score', 'N/A')}/27, Dominant feature: {phq_context.get('dominant_cluster', 'N/A')}."

        system_ctx = "You are NeuraCare AI, an empathetic clinical psychologist."
        user_prompt = f"""The patient completed the GAD-7 anxiety screening with a score of {total_score}/21 ({severity} anxiety).
{phq_summary}
Specific GAD items:
- Feeling nervous/on edge: {nervous}/3
- Inability to stop worrying: {cant_stop}/3
- Excessive worry: {worry_much}/3
- Trouble relaxing: {relax}/3
- Restlessness: {restless}/3
- Irritability: {irritable}/3
- Fear of impending catastrophe: {afraid}/3

Dominant anxiety pattern: {fallback_info['label']}.
Generate 2 compassionate, concise follow-up questions exploring avoidance, bodily sensations, or daily triggers tailored to their exact anxiety profile."""

        llm_questions = _call_openrouter_for_questions(system_ctx, user_prompt)
        final_questions = llm_questions if llm_questions else fallback_info["questions"]

        for i, q in enumerate(final_questions):
            q["id"] = f"gad_adaptive_fup_{i+1}"
            if "scale" not in q or not isinstance(q["scale"], list):
                q["scale"] = SCALE_4_SEVERITY

        return {
            "section": "gad7",
            "total_score": total_score,
            "max_score": 21,
            "severity": severity,
            "dominant_cluster": fallback_info["label"],
            "ai_clinical_observation": fallback_info["description"],
            "followup_questions": final_questions
        }


adaptive_engine = SteppedAdaptiveEngine()
