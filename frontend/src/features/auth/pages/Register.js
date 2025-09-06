import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../app/providers/AuthProvider";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", password: "", phone_number: ""
  });
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOkMsg("");
    try {
      const res = await register(form);
      setOkMsg(res?.message || "Registration successful. Please verify your email.");
    } catch (e) {
      setErr(e?.response?.data?.error || "Registration failed");
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>
        <form onSubmit={onSubmit}>
          <input placeholder="First name"
            value={form.first_name}
            onChange={e=>setForm({...form, first_name:e.target.value})}
            style={styles.input} />
          <input placeholder="Last name"
            value={form.last_name}
            onChange={e=>setForm({...form, last_name:e.target.value})}
            style={styles.input} />
          <input placeholder="University email"
            value={form.email}
            onChange={e=>setForm({...form, email:e.target.value})}
            style={styles.input} />
          <input placeholder="Password" type="password"
            value={form.password}
            onChange={e=>setForm({...form, password:e.target.value})}
            style={styles.input} />
          <input placeholder="Phone (optional)"
            value={form.phone_number}
            onChange={e=>setForm({...form, phone_number:e.target.value})}
            style={styles.input} />
          <button type="submit" style={styles.btn}>Register</button>
        </form>

        {okMsg && <p style={styles.success}>{okMsg}<br/>Check <b>{form.email}</b> for verification link.</p>}
        {err && <p style={styles.error}>{err}</p>}

        <p style={styles.footer}>
          Have an account? <Link to="/login">Login</Link>
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
    maxWidth: 420
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
  success: { color: "green", marginTop: 12 },
  error: { color: "red", marginTop: 12 },
  footer: { marginTop: 16, fontSize: "0.95rem" }
};
