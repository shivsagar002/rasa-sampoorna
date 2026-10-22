"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/navigation/site-header";
import { MobileBottomBar } from "@/components/navigation/mobile-bottom-bar";
import { SiteFooter } from "@/components/landing/site-footer";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim() || undefined,
      };

      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const details = data.error?.details;
        let msg = data.error?.message || "Registration failed. Please check your information.";
        if (Array.isArray(details) && details.length > 0) {
          msg = details.map((d: any) => d.message).join(". ");
        }
        throw new Error(msg);
      }

      window.location.href = "/account";
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred during registration.");
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
            maxWidth: "480px",
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
              Create Account
            </h1>
            <p style={{ color: "var(--text-secondary, #5a4e42)", fontSize: "14px" }}>
              Join RASA Sampoorna to curate heirlooms and track your orders.
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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label
                htmlFor="register-name"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary, #2c2621)",
                  marginBottom: "6px",
                }}
              >
                Full Name
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Priya Sharma"
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
                htmlFor="register-email"
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
                id="register-email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
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
              <label
                htmlFor="register-phone"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary, #2c2621)",
                  marginBottom: "6px",
                }}
              >
                Mobile Number (Optional)
              </label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="9876543210"
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
                htmlFor="register-password"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--text-primary, #2c2621)",
                  marginBottom: "6px",
                }}
              >
                Password (min 8 chars, letters &amp; numbers)
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={handleChange}
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
                marginTop: "10px",
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
              {isLoading ? "Creating account..." : "Create Account"}
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
            Already have an account?{" "}
            <Link
              href="/login"
              style={{
                color: "var(--accent-gold, #8c7355)",
                fontWeight: 600,
              }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>

      <MobileBottomBar />
      <SiteFooter />
    </div>
  );
}
