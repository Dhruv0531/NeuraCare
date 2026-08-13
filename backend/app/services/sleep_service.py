def calculate_sleep_score(sleep_answers: list) -> dict:
    """
    Sleep ISI (Insomnia Severity Index) scoring.
    7 items, rated 0-4 each. Total score 0-28.
    Cutoffs:
      0-7: Low
      8-14: Moderate
      15-28: High
    """
    if not sleep_answers:
        total = 0
    else:
        total = sum(int(val) for val in sleep_answers[:7])

    if total <= 7:
        level = "Low"
        category = "No clinically significant insomnia"
    elif total <= 14:
        level = "Moderate"
        category = "Subthreshold insomnia"
    else:
        level = "High"
        category = "Clinical insomnia (Moderate/Severe)"

    return {
        "score": total,
        "max_score": 28,
        "level": level,
        "category": category
    }
