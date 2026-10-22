"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">(token ? "verifying" : "error");
  const [message, setMessage] = useState(token ? "Verifying your email address..." : "No verification token found.");
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState("");

  useEffect(() => {
    if (!token) return;

    let isMounted = true;
    fetch("/api/v1/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!isMounted) return;
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Your email has been verified successfully.");
        } else {
          setStatus("error");
          setMessage(data.error?.message || "Verification failed or link expired.");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus("error");
        setMessage("An error occurred while verifying your email.");
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResending(true);
    setResendFeedback("");

    try {
      const res = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail || undefined }),
      });
      const data = await res.json();
      setResendFeedback(data.message || "A new verification link has been sent.");
    } catch {
      setResendFeedback("Failed to resend verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "480px",
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        padding: "40px 32px",
        border: "1px solid var(--border-light, #e8dfd5)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
        textAlign: "center",
      }}
    >
      <h1
        className="font-serif"
        style={{
          fontSize: "32px",
          fontWeight: 500,
          color: "var(--text-primary, #2c2621)",
          marginBottom: "12px",
        }}
      >
        Email Verification
      </h1>

      <p
        style={{
          fontSize: "15px",
          color: status === "error" ? "#c53030" : "var(--text-secondary, #5a4e42)",
          marginBottom: "28px",
          lineHeight: 1.6,
        }}
      >
        {message}
      </p>

      {status === "success" && (
        <Link
          href="/account"
          style={{
            display: "inline-block",
            padding: "12px 28px",
            backgroundColor: "var(--btn-dark, #2e3830)",
            color: "#f7f4ee",
            borderRadius: "9999px",
            fontSize: "15px",
            fontWeight: 600,
          }}
        >
          Go to My Account
        </Link>
      )}

      {status === "error" && (
        <div
          style={{
            marginTop: "20px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border-light, #e8dfd5)",
            textAlign: "left",
          }}
        >
          <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>
            Request New Verification Link
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted, #8c7d70)", marginBottom: "14px" }}>
            Verification links expire after 24 hours. Enter your email address to receive a fresh link:
          </p>
          <form onSubmit={handleResend} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input
              type="email"
              required
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="patron@example.com"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border-light, #e8dfd5)",
                fontSize: "14px",
              }}
            />
            <button
              type="submit"
              disabled={isResending}
              style={{
                padding: "10px 20px",
                backgroundColor: "var(--btn-dark, #2e3830)",
                color: "#f7f4ee",
                borderRadius: "9999px",
                fontSize: "14px",
                fontWeight: 600,
                opacity: isResending ? 0.7 : 1,
              }}
            >
              {isResending ? "Sending..." : "Resend Link"}
            </button>
          </form>
          {resendFeedback && (
            <p style={{ marginTop: "10px", fontSize: "13px", color: "var(--accent-gold, #8c7355)" }}>
              {resendFeedback}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-cream, #f7f4ee)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SiteHeader solidBackground />

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 20px 100px",
        }}
      >
        <Suspense fallback={<div>Verifying...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </main>

      <MobileBottomBar />
      <SiteFooter />
    </div>
  );
}
