import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../../api/axios";
import { endpoints } from "../../api/endpoints";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  async function me() {
    try {
      const { data } = await api.get(endpoints.auth.me);
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  async function login(email, password) {
    const { data } = await api.post(endpoints.auth.login, { email, password });
    localStorage.setItem("cc_token", data.token);
    setUser(data.user);
    return data.user;
  }

  // UPDATED: register now returns message; no token set yet
  async function register(payload) {
    const { data } = await api.post(endpoints.auth.register, payload);
    return data; // { message: "Registration successful. Please check your email…" }
  }

  async function login(email, password) {
  const { data } = await api.post(endpoints.auth.login, { email, password });
  localStorage.setItem("cc_token", data.token);
  setUser(data.user);

  // Immediately try to capture location
  // tryCaptureAndSendLocation();

  return data.user;
}

async function tryCaptureAndSendLocation() {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      try {
        await api.post(endpoints.users.setLocation, {
          latitude,
          longitude,
          accuracy_m: accuracy
        });
      } catch (err) {
        console.warn("Location update failed", err);
      }
    },
    (err) => {
      console.log("Geolocation denied/unavailable:", err.message);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}


  function logout() {
    localStorage.removeItem("cc_token");
    setUser(null);
  }

  useEffect(() => { me(); }, []);

  return (
    <AuthCtx.Provider value={{ user, ready, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
