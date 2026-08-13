import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function History() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://127.0.0.1:8000/history")
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading history from MongoDB:", err);
        setLoading(false);
      });
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBadgeColor = (level) => {
    switch (level) {
      case "High":
        return { bg: "#4a1525", color: "#ff5252" };
      case "Moderate":
        return { bg: "#4a3515", color: "#ffb74d" };
      case "Low":
      default:
        return { bg: "#154a35", color: "#3ecfb2" };
    }
  };

  return (
    <div className="container" style={{ maxWidth: "760px", margin: "0 auto", padding: "20px" }}>
      <h1>Assessment History</h1>
      <p className="subtitle" style={{ marginBottom: "24px" }}>
        Longitudinal Score History (Fetched Live from MongoDB Atlas)
      </p>

      {loading ? (
        <div className="card" style={{ padding: "30px", textAlign: "center", background: "#1a1d24" }}>
          <h3>Loading records from MongoDB...</h3>
        </div>
      ) : data.length === 0 ? (
        <div className="card" style={{ padding: "30px", textAlign: "center", background: "#1a1d24" }}>
          <p className="subtitle">No history records available yet in MongoDB Atlas.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {data.map((item, index) => {
            const preds = item.predictions || {};
            const depLevel = preds.depression?.level || "Low";
            const anxLevel = preds.anxiety?.level || "Low";
            const strLevel = preds.stress?.level || "Low";
            const sleepLevel = preds.sleep?.level || "Low";

            const levels = [depLevel, anxLevel, strLevel];
            const overallRisk = levels.includes("High") ? "High" : (levels.includes("Moderate") ? "Moderate" : "Low");
            const badge = getBadgeColor(overallRisk);
            const emotions = preds.emotion?.emotions || [];

            return (
              <div key={index} className="card" style={{ padding: "20px", borderRadius: "10px", background: "#1a1d24", borderLeft: `5px solid ${badge.color}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ color: "#aaa", fontSize: "12px" }}>{formatDate(item.created_at)}</span>
                    <h3 style={{ margin: "4px 0 0 0", color: "#eee" }}>
                      Assessment ({item.assessment_type || "DASS-42 + ISI"})
                    </h3>
                  </div>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: "12px",
                      background: badge.bg,
                      color: badge.color,
                      fontWeight: "bold",
                      fontSize: "13px"
                    }}
                  >
                    Overall: {overallRisk}
                  </span>
                </div>

                <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", fontSize: "13px", color: "#ddd" }}>
                  <div>Depression: <strong>{depLevel}</strong></div>
                  <div>Anxiety: <strong>{anxLevel}</strong></div>
                  <div>Stress: <strong>{strLevel}</strong></div>
                  <div>Sleep: <strong>{sleepLevel}</strong></div>
                </div>

                {emotions.length > 0 && (
                  <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #2a2f3a", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: "#aaa", fontSize: "12px" }}>Emotional Language Indicators:</span>
                    {emotions.map((emo, idx) => (
                      <span key={idx} style={{ padding: "2px 8px", borderRadius: "8px", background: "#3a2f5a", color: "#ddd", fontSize: "11px" }}>
                        {emo.label}: {(emo.score * 100).toFixed(0)}%
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation Buttons */}
      <div style={{ marginTop: "30px", display: "flex", gap: "12px" }}>
        <button
          onClick={() => navigate("/assessment")}
          style={{ flex: 1, padding: "12px", background: "#3ecfb2", color: "#000", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          Take New Assessment
        </button>
        <button
          onClick={() => navigate("/")}
          style={{ flex: 1, padding: "12px", background: "#2a2f3a", color: "#fff", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          Home
        </button>
      </div>
    </div>
  );
}