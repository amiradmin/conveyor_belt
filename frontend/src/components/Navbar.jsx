import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav
      style={{
        display: "flex",
        gap: "20px",
        padding: "15px",
        background: "#222",
        color: "white"
      }}
    >
      <Link to="/" style={{ color: "white", textDecoration: "none" }}>Home</Link>
      <Link to="/image-processing" style={{ color: "white", textDecoration: "none" }}>
        Image Processing
      </Link>
    </nav>
  );
}
