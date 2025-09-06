import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await login(form.email.trim(), form.password);
      nav("/dashboard");
    } catch (e) {
      const apiErr = e?.response?.data;
      if (apiErr?.details?.length) {
        setErr(apiErr.details.map(d => d.message).join(" · "));
      } else {
        setErr(apiErr?.error || "Login failed");
      }
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Login</h2>
        <form onSubmit={onSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e=>setForm({...form, email:e.target.value})}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e=>setForm({...form, password:e.target.value})}
            style={styles.input}
            required
            minLength={6}
          />
          <button type="submit" style={styles.btn}>Login</button>
        </form>

        <div style={styles.links}>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        {err && <p style={styles.error}>{err}</p>}

        <p style={styles.footer}>
          New here? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "80vh",
    background: "#f9fafb"
  },
  card: {
    background: "#fff",
    padding: "2rem",
    borderRadius: 12,
    boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
    width: "100%",
    maxWidth: 400
  },
  title: { marginBottom: 20 },
  input: {
    display: "block",
    width: "100%",
    padding: 12,
    marginBottom: 14,
    borderRadius: 8,
    border: "1px solid #d1d5db"
  },
  btn: {
    width: "100%",
    padding: 12,
    border: "none",
    borderRadius: 8,
    background: "#0b74de",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer"
  },
  links: { marginTop: 12, fontSize: "0.9rem" },
  error: { color: "red", marginTop: 12 },
  footer: { marginTop: 16, fontSize: "0.95rem" }
};
