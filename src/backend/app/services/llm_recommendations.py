import os
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "liquid/lfm-2.5-2.6b:free")

DEFAULT_RECOMMENDATIONS = {
    "Low": [
        "Practice 10 minutes of daily mindfulness meditation to maintain emotional balance.",
        "Maintain a consistent sleep schedule (7-8 hours per night) and limit blue light exposure before bedtime.",
        "Engage in moderate physical exercise (such as 30 minutes of brisk walking) at least 4 days a week.",
        "Keep a daily gratitude journal to foster positive cognitive framing."
    ],
    "Moderate": [
        "Implement box breathing exercises (4 seconds in, 4 hold, 4 out, 4 hold) during moments of heightened tension.",
        "Schedule structured 15-minute 'worry windows' to prevent persistent rumination throughout the day.",
        "Establish bedtime sleep hygiene rituals and avoid caffeine or heavy meals after 6 PM.",
        "Reach out to a trusted friend, counselor, or support group to share your current feelings."
    ],
    "High": [
        "Consult a licensed mental health professional or clinical psychologist for a comprehensive evaluation.",
        "Practice grounded sensory exercises (the 5-4-3-2-1 technique) to reduce acute anxiety and autonomic panic.",
        "Break daily activities into small, low-pressure steps to reduce feelings of executive overload.",
        "Ensure immediate access to helpline support networks and avoid isolating yourself during difficult moments."
    ]
}


def _call_gemini_recommendations(prompt: str, api_key: str, model: str) -> list:
    """Invokes Google Gemini API with native JSON response mode."""
    candidates = [model, "gemini-3.5-flash-lite"]
    seen = set()
    unique_candidates = [m for m in candidates if m and not (m in seen or seen.add(m))]

    payload = json.dumps({
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 600,
            "responseMimeType": "application/json"
        }
    }).encode("utf-8")

    for m in unique_candidates:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=12.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                if "```" in text:
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:].strip()
                parsed = json.loads(text)
                if isinstance(parsed, list) and len(parsed) > 0:
                    print(f"Generated AI recommendations using Gemini ({m})")
                    return [str(r).strip() for r in parsed[:4]]
        except Exception as e:
            print(f"Gemini model {m} attempt notice: {e}")
            continue

    return []


def _call_openrouter_recommendations(prompt: str, api_key: str, model: str) -> list:
    """Invokes OpenRouter LLM API."""
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://neuracare.ai",
        "X-Title": "NeuraCare AI Platform"
    }

    candidate_models = []
    for m in [model, "liquid/lfm-2.5-2.6b:free", "nvidia/nemotron-3.5-lightning:free"]:
        if m and m not in candidate_models:
            candidate_models.append(m)

    for m in candidate_models:
        payload = json.dumps({
            "model": m,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.7,
            "max_tokens": 400
        }).encode("utf-8")

        try:
            req = urllib.request.Request(url, data=payload, headers=headers)
            res = json.loads(urllib.request.urlopen(req, timeout=8.0).read().decode())
            msg_content = res.get("choices", [{}])[0].get("message", {}).get("content")
            if not msg_content:
                continue
            content = msg_content.strip()
            if "```" in content:
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:].strip()
            recommendations = json.loads(content)
            if isinstance(recommendations, list) and len(recommendations) > 0:
                print(f"Generated AI recommendations using OpenRouter ({m})")
                return [str(r).strip() for r in recommendations[:4]]
        except Exception as inner_e:
            print(f"OpenRouter model {m} attempt notice: {inner_e}")
            continue

    return []


def generate_ai_recommendations(depression_level: str, anxiety_level: str, stress_level: str, sleep_category: str = "", text_emotions: list = None, user_text: str = "") -> list:
    """
    Generates personalized mental health wellness recommendations using Gemini or OpenRouter LLM.
    Falls back gracefully to evidence-based clinical recommendations if APIs are unreachable.
    """
    gemini_key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY)
    gemini_model = os.getenv("GEMINI_MODEL", GEMINI_MODEL)
    openrouter_key = os.getenv("OPENROUTER_API_KEY", OPENROUTER_API_KEY)
    openrouter_model = os.getenv("OPENROUTER_MODEL", OPENROUTER_MODEL)

    overall_level = "High" if "High" in [depression_level, anxiety_level, stress_level] else ("Moderate" if "Moderate" in [depression_level, anxiety_level, stress_level] else "Low")
    fallback_list = DEFAULT_RECOMMENDATIONS.get(overall_level, DEFAULT_RECOMMENDATIONS["Low"])

    prompt = f"""
You are NeuraCare AI, an empathetic, clinical wellness recommendation assistant.
Generate 4 highly actionable, personalized, evidence-based mental health wellness strategies based on the user's screening profile below:

User Screening Profile:
- Depression Level: {depression_level}
- Anxiety Level: {anxiety_level}
- Stress Level: {stress_level}
- Sleep Quality: {sleep_category or 'Normal'}
- Detected Emotions from Text: {', '.join(text_emotions) if text_emotions else 'None'}
- Optional User Journal Text: "{user_text if user_text else 'None'}"

Rules:
1. Provide exactly 4 concise, practical recommendations (max 2 sentences per recommendation).
2. Cover evidence-based CBT techniques, sleep hygiene, stress reduction, or mindfulness.
3. Keep the tone compassionate, encouraging, and clear.
4. Do NOT include medical diagnoses.
5. Return ONLY a valid JSON array of 4 strings, format: ["Recommendation 1", "Recommendation 2", "Recommendation 3", "Recommendation 4"].
"""

    # 1. Try Google Gemini API if configured
    if gemini_key:
        try:
            recs = _call_gemini_recommendations(prompt, gemini_key, gemini_model)
            if recs:
                return recs
        except Exception as e:
            print(f"Notice: Gemini recommendation call error: {e}")

    # 2. Try OpenRouter API if configured
    if openrouter_key:
        try:
            recs = _call_openrouter_recommendations(prompt, openrouter_key, openrouter_model)
            if recs:
                return recs
        except Exception as e:
            print(f"Notice: OpenRouter recommendation call error: {e}")

    # 3. Deterministic clinical fallback
    return fallback_list
