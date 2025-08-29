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
      nav("/");
    } catch (e) {
      const apiErr = e?.response?.data;
      if (apiErr?.details?.length) {
        // Zod details -> join messages
        setErr(apiErr.details.map(d => d.message).join(" · "));
      } else {
        setErr(apiErr?.error || "Login failed");
      }
    }
  }

  const input = { padding: 10, width: 280, maxWidth: "100%" };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Login</h2>
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 8 }}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e=>setForm({...form, email: e.target.value})}
            style={input}
            required
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={e=>setForm({...form, password: e.target.value})}
            style={input}
            required
            minLength={6}
          />
        </div>
        <button type="submit">Login</button>
      </form>

      <div style={{ marginTop: 8 }}>
        <Link to="/forgot-password">Forgot password?</Link>
      </div>

      {err && <pre style={{ color: "red", whiteSpace: "pre-wrap" }}>{err}</pre>}

      <p style={{ marginTop: 16 }}>
        New here? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
