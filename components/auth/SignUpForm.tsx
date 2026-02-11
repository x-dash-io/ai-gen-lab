"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SignUpForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");
    const confirm = String(formData.get("confirmPassword") || "");

    if (!name) {
      setError("Name is required.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const payload = await response.json().catch(() => ({ error: "Failed to create account" }));

    if (!response.ok) {
      setError(payload.error || "Failed to create account.");
      setLoading(false);
      return;
    }

    const login = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!login || login.error) {
      setError("Account created, but sign-in failed. Please sign in manually.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form className="glass-card contact-form" onSubmit={handleSubmit}>
      <label>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>Name</span>
        <input type="text" name="name" placeholder="Your full name" required />
      </label>

      <label>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>Email</span>
        <input type="email" name="email" placeholder="you@company.com" required />
      </label>

      <label>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>Password</span>
        <input type="password" name="password" placeholder="Minimum 8 characters" required />
      </label>

      <label>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>Confirm password</span>
        <input type="password" name="confirmPassword" placeholder="Repeat your password" required />
      </label>

      <button className="primary-btn" type="submit" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </button>

      {error ? <p style={{ color: "#b42318", fontWeight: 600 }}>{error}</p> : null}
    </form>
  );
}
