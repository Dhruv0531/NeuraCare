import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function History() {
  const [data, setData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://127.0.0.1:8000/history")
      .then((res) => res.json())
      .then((res) => setData(res.reverse()));
  }, []);

  // ✅ Correct Mumbai (IST) formatter
  const formatDate = (dateString) => {
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

  return (
    <div className="container">
      <h1>Your Assessment History</h1>

      {data.length === 0 ? (
        <p className="subtitle">No history available yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "16px", marginTop: "20px" }}>
          {data.map((item, index) => {
            const scores = item.scores;

            return (
              <div key={index} className="card">
                {/* ✅ Date (Mumbai Time) */}
                <p className="subtitle" style={{ fontSize: "12px" }}>
                  {formatDate(item.created_at)}
                </p>

                {/* Overall */}
                <h2 style={{ color: "#3ecfb2" }}>
                  Overall: {scores.overall}%
                </h2>

                {/* Breakdown */}
                <div style={{ marginTop: "10px", fontSize: "14px" }}>
                  <p>Depression: {scores.phq}</p>
                  <p>Anxiety: {scores.gad}</p>
                  <p>Stress: {scores.stress}</p>
                  <p>Sleep: {scores.sleep}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation Buttons */}
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
          Take New Assessment
        </button>
      </div>
    </div>
  );
}