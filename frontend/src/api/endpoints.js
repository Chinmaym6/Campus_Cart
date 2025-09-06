export const endpoints = {
  auth: {
    register: "/auth/register",
    login: "/auth/login",
    me: "/auth/me",
    verify: "/auth/verify-email",
    forgot: "/auth/forgot-password",
    resetValidate: "/auth/reset-password/validate",
    reset: "/auth/reset-password",
  },

  users: {
    setLocation: "/users/location",
    meStats: "/users/me/stats",
  },

  categories: {
    list: "/categories",
  },

  items: {
    list: "/items",                // GET ?q=&category_id=&min_price=&max_price=&condition=&within_km=&sort=&page=&page_size=
    saved: "/items/saved",         // GET ?limit=
    create: "/items",     
    mine: "/items/mine",          // POST multipart/form-data
    details: (id) => `/items/${id}`,
    update:  (id) => `/items/${id}`,
    remove:  (id) => `/items/${id}`,
    save:    (id) => `/items/${id}/save`,
    unsave:  (id) => `/items/${id}/save`,
  },

  roommate: {
    matches: "/roommate/matches",
  },

  notifications: {
    recent: "/notifications/recent",
  },

    offers: {
    create: "/offers",
    accept: (id) => `/offers/${id}/accept`,
    reject: (id) => `/offers/${id}/reject`,
    withdraw: (id) => `/offers/${id}/withdraw`,
    mine: "/offers/mine",                 // ?role=buyer|seller
    forItem: (itemId) => `/offers/item/${itemId}`
  },
};
