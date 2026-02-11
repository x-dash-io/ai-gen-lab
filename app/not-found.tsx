import Link from "next/link";

export default function NotFound() {
  return (
    <div className="section">
      <div className="container-shell" style={{ maxWidth: "720px", textAlign: "center" }}>
        <span className="chip">404</span>
        <h1 className="section-title" style={{ marginTop: "1rem" }}>
          This page does not exist in the new frontend
        </h1>
        <p className="section-copy" style={{ marginTop: "0.85rem" }}>
          The previous UI was removed and replaced. Return to the new home experience.
        </p>
        <Link href="/" className="primary-btn" style={{ marginTop: "1.2rem" }}>
          Go to homepage
        </Link>
      </div>
    </div>
  );
}
