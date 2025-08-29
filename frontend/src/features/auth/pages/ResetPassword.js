import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { endpoints } from "../../../api/endpoints";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const token = searchParams.get("token");

  const [valid, setValid] = useState(false);
  const [checking, setChecking] = useState(true);
  const [passwords, setPasswords] = useState({ password: "", confirm_password: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function check() {
      if (!token) { setMsg("Missing token."); setChecking(false); return; }
      try {
        await api.get(endpoints.auth.resetValidate, { params: { token } });
        setValid(true);
      } catch (e) {
        setMsg(e?.response?.data?.error || "Invalid or expired reset link.");
      } finally {
        setChecking(false);
      }
    }
    check();
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    try {
      const { data } = await api.post(endpoints.auth.reset, { token, ...passwords });
      setMsg(data?.message || "Password updated.");
      setTimeout(() => nav("/login"), 1200);
    } catch (e) {
      setMsg(e?.response?.data?.error || "Reset failed. Make sure both passwords match and try again.");
    }
  }

  if (checking) return <div style={box}><h3>Checking your link…</h3></div>;

  if (!valid) return <div style={box}><h3>Reset link error</h3><p>{msg}</p></div>;

  return (
    <div style={box}>
      <h2>Set a new password</h2>
      <form onSubmit={onSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={passwords.password}
          onChange={e=>setPasswords({...passwords, password: e.target.value})}
        />
        <br/>
        <input
          type="password"
          placeholder="Confirm new password"
          value={passwords.confirm_password}
          onChange={e=>setPasswords({...passwords, confirm_password: e.target.value})}
        />
        <br/>
        <button type="submit">Update password</button>
      </form>
      {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
    </div>
  );
}

const box = { maxWidth: 480, margin: "48px auto", padding: 24, border: "1px solid #eee", borderRadius: 8 };
