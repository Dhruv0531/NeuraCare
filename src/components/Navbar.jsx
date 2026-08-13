import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <div
      className="navbar"
      style={{
        display: "flex",
        justify: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        background: "#14171f",
        borderBottom: "1px solid #232732"
      }}
    >
      <Link to="/" style={{ textDecoration: "none" }}>
        <h3 style={{ fontFamily: "DM Serif Display", margin: 0, color: "#fff", fontSize: "22px" }}>
          Neura<span style={{ color: "#3ecfb2" }}>Care</span>
        </h3>
      </Link>

      <div style={{ display: "flex", gap: "20px", fontSize: "14px" }}>
        <Link to="/" style={{ color: "#aaa", textDecoration: "none" }}>Home</Link>
        <Link to="/assessment" style={{ color: "#3ecfb2", textDecoration: "none", fontWeight: "bold" }}>Take Assessment</Link>
        <Link to="/history" style={{ color: "#aaa", textDecoration: "none" }}>History</Link>
        <Link to="/clinician" style={{ color: "#ffb74d", textDecoration: "none", fontWeight: "bold" }}>Clinician Portal</Link>
      </div>
    </div>
  );
}