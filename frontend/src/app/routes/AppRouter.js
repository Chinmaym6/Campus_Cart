import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "../../features/home/LandingPage";
import Login from "../../features/auth/pages/Login";
import Register from "../../features/auth/pages/Register";
import VerifyEmail from "../../features/auth/pages/VerifyEmail";
import ForgotPassword from "../../features/auth/pages/ForgotPassword";   // NEW
import ResetPassword from "../../features/auth/pages/ResetPassword";     // NEW

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />     {/* NEW */}
      <Route path="/reset-password" element={<ResetPassword />} />       {/* NEW */}
    </Routes>
  );
}
