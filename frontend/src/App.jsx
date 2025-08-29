import React from "react";
import { AuthProvider, useAuth } from "./app/providers/AuthProvider";
import AppRouter from "./app/routes/AppRouter";
import Navbar from "./shared/components/Navbar";
import LocationPrompt from "./shared/components/LocationPrompt";

function Layout() {
  const { user } = useAuth();
  return (
    <>
      <Navbar />
      {user && <LocationPrompt />}  {/* show only for logged-in users */}
      <AppRouter />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  );
}
