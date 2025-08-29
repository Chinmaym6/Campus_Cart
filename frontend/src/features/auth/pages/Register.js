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
      const res = await register(form); // { message: "..." }
      setOkMsg(res?.message || "Registration successful. Please verify your email.");
      // optional: navigate to a “check your email” helper page:
      // nav("/check-email?to=" + encodeURIComponent(form.email));
    } catch (e) {
      setErr(e?.response?.data?.error || "Registration failed");
    }
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Create Account</h2>
      <form onSubmit={onSubmit}>
        <input placeholder="First name" value={form.first_name}
          onChange={e=>setForm({...form, first_name:e.target.value})} />
        <br/>
        <input placeholder="Last name" value={form.last_name}
          onChange={e=>setForm({...form, last_name:e.target.value})} />
        <br/>
        <input placeholder="University email" value={form.email}
          onChange={e=>setForm({...form, email:e.target.value})} />
        <br/>
        <input placeholder="Password" type="password" value={form.password}
          onChange={e=>setForm({...form, password:e.target.value})} />
        <br/>
        <input placeholder="Phone (optional)" value={form.phone_number}
          onChange={e=>setForm({...form, phone_number:e.target.value})} />
        <br/>
        <button type="submit">Register</button>
      </form>

      {okMsg && <p style={{ color: "green", marginTop: 8 }}>
        {okMsg}<br/>
        Please check <b>{form.email}</b> for a verification link.
      </p>}
      {err && <p style={{ color: "red", marginTop: 8 }}>{err}</p>}

      <p>Have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}
