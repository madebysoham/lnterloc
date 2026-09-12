import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "#0b0f14",
        color: "#ffffff",
        fontFamily: "var(--font-main), sans-serif",
      }}
    >
      <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>404 - Page Not Found</h2>
      <p style={{ color: "#94a3b8", marginTop: "0.5rem" }}>The requested page could not be located.</p>
      <Link
        href="/"
        style={{
          marginTop: "1.5rem",
          background: "#c6f10e",
          color: "#111827",
          padding: "8px 16px",
          borderRadius: "8px",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
