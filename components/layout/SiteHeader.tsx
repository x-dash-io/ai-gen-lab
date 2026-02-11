import Link from "next/link";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

const NAV_LINKS = [
  { href: "/courses", label: "Courses" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container-shell site-header-inner">
        <Link href="/" className="brand-mark" aria-label="AI Genius Lab home">
          <span className="brand-glyph">AG</span>
          <span>AI Genius Lab</span>
        </Link>

        <nav className="site-nav" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div style={{ display: "flex", gap: "0.55rem" }}>
          <PrimaryButton href="/sign-in" variant="ghost">
            Sign In
          </PrimaryButton>
          <PrimaryButton href="/sign-up">Start Free</PrimaryButton>
        </div>
      </div>
    </header>
  );
}
