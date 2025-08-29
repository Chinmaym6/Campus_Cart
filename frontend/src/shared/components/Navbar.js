import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import Logo from "./Logo";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav style={{ padding: "1rem", borderBottom: "1px solid #eee", display: "flex", gap: 16 }}>
      <Logo />
      <Link to="/">Home</Link>
      <div style={{ marginLeft: "auto" }}>
        {user ? (
          <>
            <span style={{ marginRight: 12 }}>Hi, {user.first_name || user.email}</span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>{" | "}
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
