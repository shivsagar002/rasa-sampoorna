"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const details = data.error?.details;
        let msg = data.error?.message || "Invalid email or password.";
        if (Array.isArray(details) && details.length > 0) {
          msg = details.map((d: any) => d.message).join(". ");
        }
        throw new Error(msg);
      }

      window.location.href = "/account";
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred during sign-in.");
    } finally {
      setIsLoading(false);
    }
  };

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
              Sign In
            </h1>
            <p style={{ color: "var(--text-secondary, #5a4e42)", fontSize: "14px" }}>
              Welcome back to your RASA Sampoorna account.
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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label
                htmlFor="login-email"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary, #2c2621)",
                  marginBottom: "6px",
                }}
              >
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="patron@example.com"
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-primary, #2c2621)",
                  }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: "12px",
                    color: "var(--accent-gold, #8c7355)",
                    fontWeight: 500,
                  }}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div
            style={{
              marginTop: "28px",
              paddingTop: "20px",
              borderTop: "1px solid var(--border-light, #e8dfd5)",
              textAlign: "center",
              fontSize: "14px",
              color: "var(--text-secondary, #5a4e42)",
            }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              style={{
                color: "var(--accent-gold, #8c7355)",
                fontWeight: 600,
              }}
            >
              Create Account
            </Link>
          </div>
        </div>
      </main>

      <MobileBottomBar />
      <SiteFooter />
    </div>
  );
}
