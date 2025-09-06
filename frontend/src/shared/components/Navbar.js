import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import Logo from "./Logo";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav style={styles.nav}>
      <Logo />
      {user && (
        <div style={styles.links}>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/roommate">Roommates</Link>
          <Link to="/notifications">Notifications</Link>
          <Link to="/offers">Offers</Link>{" | "}

        </div>
      )}
      <div style={{ marginLeft: "auto" }}>
        {user ? (
  <>
    <Link to="/marketplace">Marketplace</Link>{" | "}
    <Link to="/marketplace/mine">My Listings</Link>{" | "}
    <Link to="/marketplace/saved">Saved</Link>{" | "}
    <Link to="/marketplace/create">Sell</Link>
    <span style={{ marginLeft: 12, marginRight: 12 }}>Hi, {user.first_name || user.email}</span>
    <button onClick={logout}>Logout</button>
  </>
) : (
          <>
            <Link to="/login">Login</Link>{" | "}
            <Link to="/register">Register</Link>
             <Link to="/">Home</Link>
          </>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    padding: "1rem",
    borderBottom: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#f9fafb"
  },
  links: {
    display: "flex",
    gap: 20,
    marginLeft: 30
  },
  logoutBtn: {
    padding: "6px 12px",
    border: "none",
    borderRadius: 6,
    background: "#0b74de",
    color: "#fff",
    cursor: "pointer"
  }
};
