"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") || ""),
      email: String(formData.get("email") || ""),
      subject: String(formData.get("subject") || "general"),
      message: String(formData.get("message") || ""),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to send message" }));
        setStatus("error");
        setMessage(data.error || "Failed to send message");
        return;
      }

      setStatus("success");
      setMessage("Message sent successfully. We will respond soon.");
      event.currentTarget.reset();
    } catch {
      setStatus("error");
      setMessage("Failed to send message. Please try again.");
    }
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
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>Reason</span>
        <select name="subject" style={{ border: "1px solid var(--line)", borderRadius: "12px", padding: "0.72rem 0.84rem", font: "inherit" }}>
          <option value="general">General</option>
          <option value="course">Course</option>
          <option value="technical">Technical</option>
          <option value="billing">Billing</option>
          <option value="partnership">Partnership</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label>
        <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--ink)" }}>Message</span>
        <textarea name="message" placeholder="Tell us how we can help" required />
      </label>

      <button className="primary-btn" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send message"}
      </button>

      {message ? (
        <p style={{ color: status === "success" ? "var(--accent-strong)" : "#b42318", fontWeight: 600 }}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
