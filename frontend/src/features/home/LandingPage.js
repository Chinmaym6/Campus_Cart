import { useAuth } from "../../app/providers/AuthProvider";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <main style={styles.hero}>
      <div style={styles.card}>
        <h1 style={styles.title}>🎓 Campus Cart</h1>
        <p style={styles.subtitle}>
          Buy & sell textbooks, electronics, and furniture. <br />
          Find your perfect roommate. All within your campus.
        </p>

        {user ? (
          <p style={styles.welcome}>
            Welcome back, <b>{user.first_name || user.email}</b>!
          </p>
        ) : (
          <div style={styles.actions}>
            <Link to="/login" style={styles.btnPrimary}>Login</Link>
            <Link to="/register" style={styles.btnSecondary}>Create Account</Link>
          </div>
        )}
      </div>
    </main>
  );
}

const styles = {
  hero: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "80vh",
    background: "linear-gradient(135deg, #0b74de, #4f46e5)",
    color: "#fff",
    textAlign: "center",
    padding: "2rem"
  },
  card: {
    background: "rgba(255,255,255,0.1)",
    padding: "2rem 3rem",
    borderRadius: 16,
    maxWidth: 600,
    boxShadow: "0 6px 20px rgba(0,0,0,0.25)"
  },
  title: { fontSize: "2.5rem", marginBottom: 16 },
  subtitle: { fontSize: "1.2rem", marginBottom: 24 },
  welcome: { fontSize: "1.1rem", marginTop: 12 },
  actions: { display: "flex", gap: 16, justifyContent: "center" },
  btnPrimary: {
    padding: "10px 20px",
    background: "#fff",
    color: "#0b74de",
    borderRadius: 8,
    textDecoration: "none",
    fontWeight: "bold"
  },
  btnSecondary: {
    padding: "10px 20px",
    background: "transparent",
    border: "2px solid #fff",
    borderRadius: 8,
    color: "#fff",
    textDecoration: "none",
    fontWeight: "bold"
  }
};
