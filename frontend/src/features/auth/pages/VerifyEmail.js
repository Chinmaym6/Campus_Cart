import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { endpoints } from "../../../api/endpoints";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    async function run() {
      if (!token) { setStatus("error"); setMessage("Missing verification token."); return; }
      try {
        const { data } = await api.get(endpoints.auth.verify, { params: { token } });
        if (data?.ok) {
          setStatus("success");
          setMessage("Your email has been verified! Redirecting to login…");
          setTimeout(() => nav("/login"), 1500);
        } else {
          throw new Error("Invalid response");
        }
      } catch (e) {
        // If token already used but user verified, backend now returns ok via idempotent logic.
        // If we’re here, it’s genuinely invalid/expired.
        const errMsg = e?.response?.data?.error || "Invalid or expired verification link.";
        setStatus("error");
        setMessage(errMsg);
      }
    }
    run();
  }, [token, nav]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {status === "verifying" && (
          <>
            <div style={styles.spinner} />
            <h2 style={styles.title}>Verifying your email…</h2>
            <p style={styles.subtitle}>Please wait a moment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ ...styles.icon, ...styles.success }}>✓</div>
            <h2 style={styles.title}>Email verified</h2>
            <p style={styles.subtitle}>Redirecting you to the login page…</p>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ ...styles.icon, ...styles.error }}>!</div>
            <h2 style={styles.title}>Verification failed</h2>
            <p style={styles.subtitle}>{message}</p>
            <button style={styles.button} onClick={() => nav("/login")}>Go to Login</button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" },
  card: { width: "100%", maxWidth: 460, border: "1px solid #e8e8e8", borderRadius: 16, padding: "28px 24px 32px", textAlign: "center", boxShadow: "0 10px 24px rgba(0,0,0,0.06)", background: "#fff" },
  spinner: { width: 54, height: 54, margin: "10px auto 14px", borderRadius: "50%", border: "6px solid #e6eaf2", borderTop: "6px solid #0b74de", animation: "spin 0.9s linear infinite" },
  title: { margin: "8px 0 6px", fontSize: 22 },
  subtitle: { margin: "0 0 8px", color: "#666" },
  icon: { width: 56, height: 56, lineHeight: "56px", borderRadius: "50%", display: "inline-block", fontWeight: 700, color: "#fff", marginBottom: 12 },
  success: { background: "#22c55e" },
  error: { background: "#ef4444" },
  button: { marginTop: 12, padding: "10px 16px", borderRadius: 8, border: "none", background: "#0b74de", color: "#fff", cursor: "pointer" }
};
