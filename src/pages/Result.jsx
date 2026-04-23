import { useLocation, useNavigate } from "react-router-dom";

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();

  const result = location.state?.result;

  if (!result) {
    return <div className="container">No data available</div>;
  }

  const labels = ["Depression", "Anxiety", "Stress", "Sleep"];

  const scores = [result.phq, result.gad, result.stress, result.sleep];

  const maxScores = [27, 21, 42, 28];

  const percentages = scores.map((s, i) =>
    Math.round((s / maxScores[i]) * 100),
  );

  const overall = result.overall;

  return (
    <div className="container">
      <h1>Your Mental Health Report</h1>

      <div className="card" style={{ textAlign: "center" }}>
        <p className="subtitle">Overall Risk Score</p>
        <h1 style={{ color: "#3ecfb2" }}>{overall}%</h1>
      </div>

      <div style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
        {percentages.map((p, i) => (
          <div key={i} className="card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{labels[i]}</span>
              <span>{scores[i]}</span>
            </div>

            <h2>{p}%</h2>

            <div className="progress">
              <div
                className="progress-fill"
                style={{
                  width: `${p}%`,
                  background: "#3ecfb2",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "30px" }}>
        <button
          className="button"
          style={{ width: "100%" }}
          onClick={() => navigate("/")}
        >
          Back to Home
        </button>

        <button
          className="button"
          style={{
            width: "100%",
            marginTop: "10px",
            background: "#1a1e26",
            color: "#fff",
          }}
          onClick={() => navigate("/assessment")}
        >
          Retake Assessment
        </button>
        <button
          className="button"
          style={{ width: "100%", marginTop: "10px" }}
          onClick={() => navigate("/history")}
        >
          View History
        </button>
      </div>
    </div>
  );
}
