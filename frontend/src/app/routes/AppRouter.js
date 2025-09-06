import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "../../features/home/LandingPage";
import Login from "../../features/auth/pages/Login";
import Register from "../../features/auth/pages/Register";
import VerifyEmail from "../../features/auth/pages/VerifyEmail";
import ForgotPassword from "../../features/auth/pages/ForgotPassword";
import ResetPassword from "../../features/auth/pages/ResetPassword";
import Dashboard from "../../features/dashboard/Dashboard";
import PublicRoute from "./PublicRoute";
import PrivateRoute from "./PrivateRoute";

import MarketplaceList from "../../features/marketplace/list/MarketplaceList";
import CreateItem from "../../features/marketplace/create/CreateItem";
import ItemDetails from "../../features/marketplace/details/ItemDetails";
import MyListings from "../../features/marketplace/list/MyListings";      // ✅ NEW
import SavedItems from "../../features/marketplace/list/SavedItems";   
import OffersInbox from "../../features/offers/OffersInbox";
export default function AppRouter() {
  return (
    <Routes>
      {/* Public landing - if logged in, bounce to dashboard */}
      <Route
        path="/"
        element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        }
      />

      {/* Auth pages: if logged in, bounce to dashboard */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />
      <Route
        path="/verify-email"
        element={
          <PublicRoute>
            <VerifyEmail />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />

      {/* Private route: only logged-in users can see */}
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />

      <Route
  path="/marketplace"
  element={
    <PrivateRoute>
      <MarketplaceList />
    </PrivateRoute>
  }
/>
<Route
  path="/marketplace/create"
  element={
    <PrivateRoute>
      <CreateItem />
    </PrivateRoute>
  }
/>
<Route
  path="/marketplace/:id"
  element={
    <PrivateRoute>
      <ItemDetails />
    </PrivateRoute>
  }
/>

<Route
  path="/marketplace"
  element={
    <PrivateRoute>
      <MarketplaceList />
    </PrivateRoute>
  }
/>

<Route
  path="/marketplace/mine"
  element={
    <PrivateRoute>
      <MyListings />
    </PrivateRoute>
  }
/>

<Route
  path="/marketplace/saved"
  element={
    <PrivateRoute>
      <SavedItems />
    </PrivateRoute>
  }
/>

<Route
  path="/offers"
  element={
    <PrivateRoute>
      <OffersInbox />
    </PrivateRoute>
  }
/>
    </Routes>
  );
}
