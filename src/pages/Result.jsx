import { useLocation, useNavigate } from "react-router-dom";

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();

  const result = location.state?.result;

  if (!result) {
    return (
      <div className="container" style={{ padding: "40px", textAlign: "center" }}>
        <h2>No Assessment Data Found</h2>
        <button
          onClick={() => navigate("/assessment")}
          style={{ marginTop: "20px", padding: "10px 20px", background: "#3ecfb2", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
        >
          Take Assessment
        </button>
      </div>
    );
  }

  const getBadgeColor = (level) => {
    switch (level) {
      case "High":
        return { bg: "#4a1525", color: "#ff5252", border: "#ff5252" };
      case "Moderate":
        return { bg: "#4a3515", color: "#ffb74d", border: "#ffb74d" };
      case "Low":
      default:
        return { bg: "#154a35", color: "#3ecfb2", border: "#3ecfb2" };
    }
  };

  const depLevel = result.depression?.level || "Low";
  const anxLevel = result.anxiety?.level || "Low";
  const strLevel = result.stress?.level || "Low";

  // Highest risk level overall
  const levels = [depLevel, anxLevel, strLevel];
  const overallRisk = levels.includes("High") ? "High" : (levels.includes("Moderate") ? "Moderate" : "Low");
  const overallBadge = getBadgeColor(overallRisk);

  const mlScales = [
    { key: "depression", title: "Depression Subscale", data: result.depression },
    { key: "anxiety", title: "Anxiety Subscale", data: result.anxiety },
    { key: "stress", title: "Stress Subscale", data: result.stress }
  ];

  const sleepData = result.sleep || { level: "Low", score: 0, category: "Normal" };
  const emotionData = result.emotion || { status: "not_available", message: "No text provided" };

  return (
    <div className="container" style={{ maxWidth: "820px", margin: "0 auto", padding: "20px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "4px" }}>Assessment Complete</h1>
      <p className="subtitle" style={{ textAlign: "center", marginBottom: "24px" }}>
        AI-Assisted Mental Health Risk Assessment & Explainable Insights
      </p>

      {/* OVERALL RISK BANNER */}
      <div
        className="card"
        style={{
          padding: "24px",
          borderRadius: "12px",
          background: "#1a1d24",
          textAlign: "center",
          border: `2px solid ${overallBadge.border}`,
          marginBottom: "24px"
        }}
      >
        <p className="subtitle" style={{ fontSize: "14px", margin: 0 }}>Overall Risk Screening Status</p>
        <h1 style={{ color: overallBadge.color, margin: "8px 0", fontSize: "32px" }}>
          {overallRisk.toUpperCase()} RISK
        </h1>
        <p style={{ color: "#aaa", fontSize: "13px", margin: 0 }}>
          Based on structured DASS-42 assessment inputs evaluated by XGBoost ML models.
        </p>
      </div>

      {/* RISK OVERVIEW CARDS */}
      <h3 style={{ marginBottom: "12px", color: "#ddd" }}>Risk Level Breakdown</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "28px" }}>
        {mlScales.map(({ key, title, data }) => {
          if (!data) return null;
          const badge = getBadgeColor(data.level);
          return (
            <div
              key={key}
              className="card"
              style={{
                padding: "20px",
                borderRadius: "10px",
                background: "#1a1d24",
                borderTop: `4px solid ${badge.color}`
              }}
            >
              <h4 style={{ margin: "0 0 8px 0", color: "#eee" }}>{title}</h4>
              <span
                style={{
                  padding: "4px 10px",
                  borderRadius: "12px",
                  background: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                  fontWeight: "bold",
                  fontSize: "13px"
                }}
              >
                {data.level} Risk
              </span>
              {data.probabilities && (
                <div style={{ marginTop: "12px", color: "#aaa", fontSize: "12px" }}>
                  Probabilities: Low {(data.probabilities.low * 100).toFixed(0)}% • Mod {(data.probabilities.moderate * 100).toFixed(0)}% • High {(data.probabilities.high * 100).toFixed(0)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SHAP EXPLAINABILITY */}
      <div className="card" style={{ padding: "24px", borderRadius: "12px", background: "#1a1d24", marginBottom: "28px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "6px" }}>Why did the model produce this result?</h3>
        <p className="subtitle" style={{ marginBottom: "20px", fontSize: "13px" }}>
          SHAP (SHapley Additive exPlanations) key contributing factors:
        </p>

        <div style={{ display: "grid", gap: "16px" }}>
          {mlScales.map(({ key, title, data }) => {
            const shapList = data?.shap_explanation || [];
            if (shapList.length === 0) return null;

            return (
              <div key={key} style={{ padding: "16px", borderRadius: "8px", background: "#232732" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#3ecfb2", fontSize: "14px" }}>
                  Factors Influencing {title}:
                </h4>
                <div style={{ display: "grid", gap: "8px" }}>
                  {shapList.map((factor, idx) => {
                    const isPositive = factor.impact > 0;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          background: "#1a1d24"
                        }}
                      >
                        <span style={{ color: "#eee" }}>
                          <strong>{factor.description}</strong> ({factor.feature})
                        </span>
                        <span style={{ color: isPositive ? "#ff5252" : "#3ecfb2", fontWeight: "bold" }}>
                          {isPositive ? `High Influence (+${factor.impact})` : `Lowers Risk (${factor.impact})`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GOEMOTIONS NLP EMOTIONAL INDICATORS */}
      <div className="card" style={{ padding: "24px", borderRadius: "12px", background: "#1a1d24", marginBottom: "28px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "4px" }}>Detected Emotional Language Indicators</h3>
        <p style={{ color: "#aaa", fontSize: "13px", marginBottom: "18px" }}>
          These emotional indicators were detected from the optional text you provided using our Hugging Face GoEmotions DistilBERT NLP model.
        </p>

        {emotionData.status === "not_available" ? (
          <div style={{ padding: "14px", borderRadius: "8px", background: "#232732", color: "#aaa", fontSize: "13px" }}>
            ℹ️ {emotionData.message || "No optional text was submitted for NLP emotion analysis."}
          </div>
        ) : emotionData.emotions && emotionData.emotions.length > 0 ? (
          <div style={{ display: "grid", gap: "12px" }}>
            {emotionData.emotions.map((item, i) => {
              const pct = Math.round(item.score * 100);
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", marginBottom: "4px" }}>
                    <span style={{ textTransform: "capitalize", fontWeight: "bold", color: "#eee" }}>{item.label}</span>
                    <span style={{ color: "#3ecfb2", fontWeight: "bold" }}>{pct}%</span>
                  </div>
                  <div style={{ height: "8px", width: "100%", background: "#2a2f3a", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "#3ecfb2", borderRadius: "4px" }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: "#aaa", fontSize: "13px" }}>No strong emotional patterns detected in provided text.</div>
        )}
      </div>

      {/* SLEEP QUALITY CARD */}
      <div className="card" style={{ padding: "20px", borderRadius: "12px", background: "#1a1d24", marginBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0 }}>Sleep Quality (ISI Index)</h3>
            <p className="subtitle" style={{ margin: "4px 0 0 0", fontSize: "13px" }}>
              Score: {sleepData.score} / {sleepData.max_score || 28} • {sleepData.category}
            </p>
          </div>
          <span
            style={{
              padding: "6px 14px",
              borderRadius: "16px",
              background: getBadgeColor(sleepData.level).bg,
              color: getBadgeColor(sleepData.level).color,
              border: `1px solid ${getBadgeColor(sleepData.level).border}`,
              fontWeight: "bold",
              fontSize: "14px"
            }}
          >
            {sleepData.level} Risk
          </span>
        </div>
      </div>

      {/* WELLBEING SUGGESTIONS */}
      <div className="card" style={{ padding: "24px", borderRadius: "12px", background: "#1a1d24", marginBottom: "28px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "12px" }}>What You Can Do Next</h3>
        <ul style={{ color: "#ccc", fontSize: "14px", lineHeight: "1.8", paddingLeft: "20px", margin: 0 }}>
          <li>Practice consistent daily sleep hygiene routines.</li>
          <li>Engage in 20-30 minutes of light physical activity or mindfulness breathing exercises.</li>
          <li>Consider sharing your assessment report with a healthcare professional or counselor.</li>
        </ul>
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => navigate("/assessment")}
          style={{ flex: 1, padding: "14px", background: "#3ecfb2", color: "#000", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          Retake Assessment
        </button>
        <button
          onClick={() => navigate("/history")}
          style={{ flex: 1, padding: "14px", background: "#2a2f3a", color: "#fff", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          View History
        </button>
      </div>

      {/* MEDICAL DISCLAIMER */}
      <div style={{ padding: "14px", borderRadius: "8px", background: "#14171f", border: "1px solid #232732", textAlign: "center", color: "#888", fontSize: "12px" }}>
        ⚠️ <strong>Medical Disclaimer:</strong> NeuraCare provides AI-assisted mental-health risk assessment and screening. It is not a medical diagnosis and should not replace evaluation by a qualified mental-health professional.
      </div>
    </div>
  );
}
