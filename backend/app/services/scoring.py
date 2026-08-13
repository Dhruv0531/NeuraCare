def calculate_scores(data):
    phq = sum(data["phq"])
    gad = sum(data["gad"])
    stress = sum(data["stress"])
    sleep = sum(data["sleep"])

    # DASS scaling
    stress_scaled = stress * 2

    overall = round((phq/27 + gad/21 + stress_scaled/42 + sleep/28) * 25)

    return {
        "phq": phq,
        "gad": gad,
        "stress": stress_scaled,
        "sleep": sleep,
        "overall": overall
    }