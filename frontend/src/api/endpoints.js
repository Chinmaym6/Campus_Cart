export const endpoints = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    me: "/auth/me",
    verify: "/auth/verify-email",
    forgot: "/auth/forgot-password",
    resetValidate: "/auth/reset-password/validate",
    reset: "/auth/reset-password"
  },
  users: {
    setLocation: "/users/location"  // 👈 new
  }
};
