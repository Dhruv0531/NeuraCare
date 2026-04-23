import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Processing() {
  const navigate = useNavigate();
  const location = useLocation();

  const scores = location.state?.scores || [0, 0, 0, 0];

  useEffect(() => {
    setTimeout(() => {
      navigate("/result", { state: { scores } });
    }, 2000);
  }, []);

  return (
    <div className="container">
      <h1>Analyzing your responses</h1>
      <p className="subtitle">Running AI models...</p>

      <div style={{ marginTop: "30px" }}>
        <div className="progress">
          <div
            className="progress-fill"
            style={{ width: "70%", background: "#3ecfb2" }}
          />
        </div>
      </div>
    </div>
  );
}
