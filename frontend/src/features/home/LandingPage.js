import React from "react";
import { useAuth } from "../../app/providers/AuthProvider";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const { user } = useAuth();
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Campus Cart</h1>
      <p>A safe marketplace & roommate finder for students.</p>
      {user ? (
        <p>Welcome back, {user.first_name || user.email}!</p>
      ) : (
        <p>
          <Link to="/login">Login</Link> or <Link to="/register">Create account</Link>
        </p>
      )}
    </main>
  );
}
