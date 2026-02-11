import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact", label: "Contact" },
  { href: "/sign-in", label: "Sign In" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container-shell site-footer-row">
        <p style={{ fontWeight: 700, color: "var(--ink)" }}>AI Genius Lab</p>
        <div className="foot-links">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>
        <p style={{ fontSize: "0.86rem" }}>© {new Date().getFullYear()} All rights reserved.</p>
      </div>
    </footer>
  );
}
