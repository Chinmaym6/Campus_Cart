import React, { useState } from "react";
import api from "../../../api/axios";
import { endpoints } from "../../../api/endpoints";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setOkMsg(""); setErr("");
    try {
      const { data } = await api.post(endpoints.auth.forgot, { email });
      setOkMsg(data?.message || "If that email exists, we’ve sent a reset link.");
    } catch (e) {
      // Always show same message to prevent enumeration
      setOkMsg("If that email exists, we’ve sent a reset link.");
    }
  }

  return (
    <div style={box}>
      <h2>Forgot Password</h2>
      <p>Enter your registered email. If it exists, we’ll send a password reset link.</p>
      <form onSubmit={onSubmit}>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <br/>
        <button type="submit">Send reset link</button>
      </form>
      {okMsg && <p style={{ color: "green" }}>{okMsg}</p>}
      {err && <p style={{ color: "red" }}>{err}</p>}
    </div>
  );
}

const box = { maxWidth: 480, margin: "48px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 };
