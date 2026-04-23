import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="container">
      <h1 className="title">NeuraCare</h1>
      <p className="subtitle">AI-based mental health risk assessment</p>

      <button className="button" onClick={() => navigate("/assessment")}>
        Start Full Assessment
      </button>
      <button
        className="button"
        style={{ marginTop: "10px", background: "#1a1e26", color: "#fff" }}
        onClick={() => navigate("/history")}
      >
        View Past Reports
      </button>
    </div>
  );
}
