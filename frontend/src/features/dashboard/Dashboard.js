import React, { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import { endpoints } from "../../api/endpoints";
import { useAuth } from "../../app/providers/AuthProvider";
import StatCard from "../../shared/components/StatCard";
import ItemCard from "../../shared/components/ItemCard";
import RoommateCard from "../../shared/components/RoommateCard";
import NotificationCard from "../../shared/components/NotificationCard";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);           // 👈 add this
  const [recentItems, setRecentItems] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [roommateMatches, setRoommateMatches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const didRun = useRef(false);                       // guard StrictMode

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    (async () => {
      // stats
      try {
        const { data } = await api.get(endpoints.users.meStats);
        setStats(data.stats || null);
      } catch {}

      // recent items near you
      try {
        const { data } = await api.get(endpoints.items.list + "?limit=4&within_km=10");
        setRecentItems(data.items || []);
      } catch {}

      // saved items
      try {
        const { data } = await api.get(endpoints.items.saved + "?limit=4");
        setSavedItems(data.items || []);
      } catch {}

      // roommate matches
      try {
        const { data } = await api.get(endpoints.roommate.matches + "?limit=3");
        setRoommateMatches(data.matches || []);
      } catch {}

      // notifications
      try {
        const { data } = await api.get(endpoints.notifications.recent + "?limit=3");
        setNotifications(data.notifications || []);
      } catch {}
    })();
  }, []);

  return (
    <main style={styles.wrapper}>
      <section style={styles.banner}>
        <h2>Welcome back, {user.first_name || user.email} 👋</h2>
        <p>What would you like to do today?</p>
        <div style={styles.bannerBtns}>
          <Link to="/marketplace/create" style={styles.btn}>+ Sell an Item</Link>
          <Link to="/roommate/create" style={styles.btnOutline}>+ Create Roommate Post</Link>
  <Link to="/marketplace/mine" style={styles.btnOutline}>My Listings</Link>
  <Link to="/marketplace/saved" style={styles.btnOutline}>Saved</Link>
  </div>
      </section>

      <section style={styles.stats}>
        <StatCard title="My Listings" value={stats?.my_listings ?? 0} />
        <StatCard title="Items Sold" value={stats?.items_sold ?? 0} />
        <StatCard title="Saved Items" value={stats?.saved_items ?? savedItems.length} />
        <StatCard title="Roommate Posts" value={stats?.roommate_posts ?? 0} />
      </section>

      <Section title="📦 Recent Listings Near You">
        <div style={styles.grid}>
          {recentItems.map(item => <ItemCard key={item.id} item={item} />)}
          {!recentItems.length && <p>No items yet.</p>}
        </div>
      </Section>

      <Section title="❤️ Saved Items">
        <div style={styles.grid}>
          {savedItems.map(item => <ItemCard key={item.id} item={item} />)}
          {!savedItems.length && <p>No saved items.</p>}
        </div>
      </Section>

      <Section title="🏠 Roommate Matches">
        <div style={styles.grid}>
          {roommateMatches.map(match => <RoommateCard key={match.id} post={match} />)}
          {!roommateMatches.length && <p>No matches yet.</p>}
        </div>
      </Section>

      <Section title="🔔 Recent Notifications">
        <div style={styles.grid}>
          {notifications.map(n => <NotificationCard key={n.id} notif={n} />)}
          {!notifications.length && <p>No notifications yet.</p>}
        </div>
      </Section>
    </main>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginTop: 40 }}>
      <h3 style={{ marginBottom: 16 }}>{title}</h3>
      {children}
    </section>
  );
}
const styles = {
  wrapper: { padding: "2rem" },
  banner: {
    background: "#f0f4ff",
    padding: "1.5rem",
    borderRadius: 12,
    textAlign: "center"
  },
  bannerBtns: { marginTop: 16, display: "flex", gap: 16, justifyContent: "center" },
  btn: {
    padding: "10px 18px",
    background: "#0b74de",
    color: "#fff",
    borderRadius: 8,
    textDecoration: "none"
  },
  btnOutline: {
    padding: "10px 18px",
    border: "2px solid #0b74de",
    borderRadius: 8,
    color: "#0b74de",
    textDecoration: "none"
  },
  stats: { display: "flex", gap: 20, marginTop: 24, flexWrap: "wrap" },

  // ⬇️ consistent card grid: min 220px tiles, nice gaps
  grid: {
    display: "grid",
    gap: 18,
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    alignItems: "start"
  }
};