"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!token) {
      setErrorMsg("Missing or invalid password reset token.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Password reset failed.");
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "460px",
        width: "100%",
        backgroundColor: "#ffffff",
        borderRadius: "20px",
        padding: "40px 32px",
        border: "1px solid var(--border-light, #e8dfd5)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h1
          className="font-serif"
          style={{
            fontSize: "32px",
            fontWeight: 500,
            color: "var(--text-primary, #2c2621)",
            marginBottom: "8px",
          }}
        >
          Set New Password
        </h1>
        <p style={{ color: "var(--text-secondary, #5a4e42)", fontSize: "14px" }}>
          Please choose a strong password with at least 8 characters.
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#fff5f5",
            color: "#c53030",
            border: "1px solid #feb2b2",
            borderRadius: "8px",
            fontSize: "14px",
            marginBottom: "20px",
          }}
        >
          {errorMsg}
        </div>
      )}

      {isSuccess ? (
        <div
          style={{
            padding: "24px 20px",
            backgroundColor: "var(--bg-card, #faf7f2)",
            borderRadius: "12px",
            border: "1px solid var(--border-light, #e8dfd5)",
            textAlign: "center",
          }}
        >
          <h3 className="font-serif" style={{ fontSize: "20px", marginBottom: "8px" }}>
            Password Reset Complete
          </h3>
          <p style={{ fontSize: "14px", color: "var(--text-secondary, #5a4e42)", marginBottom: "20px" }}>
            Your password has been securely updated. You can now log in with your new credentials.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              padding: "10px 24px",
              backgroundColor: "var(--btn-dark, #2e3830)",
              color: "#f7f4ee",
              borderRadius: "9999px",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Sign In Now
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <label
              htmlFor="reset-new-password"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary, #2c2621)",
                marginBottom: "6px",
              }}
            >
              New Password
            </label>
            <input
              id="reset-new-password"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-light, #e8dfd5)",
                fontSize: "15px",
                outline: "none",
                backgroundColor: "#ffffff",
                color: "var(--text-primary, #2c2621)",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="reset-confirm-password"
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--text-primary, #2c2621)",
                marginBottom: "6px",
              }}
            >
              Confirm New Password
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-light, #e8dfd5)",
                fontSize: "15px",
                outline: "none",
                backgroundColor: "#ffffff",
                color: "var(--text-primary, #2c2621)",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "14px",
              backgroundColor: "var(--btn-dark, #2e3830)",
              color: "#f7f4ee",
              borderRadius: "9999px",
              fontWeight: 600,
              fontSize: "15px",
              transition: "opacity 0.2s ease",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? "Updating password..." : "Update Password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <Suspense fallback={<div>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </main>

      <MobileBottomBar />
      <SiteFooter />
    </div>
  );
}
