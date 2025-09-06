import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function PublicRoute({ children }) {
  const { user } = useAuth();
  // if logged in, redirect them to dashboard
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}
