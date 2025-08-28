const API_BASE = "/api";

export const ENDPOINTS = {
  auth: {
    register: `${API_BASE}/auth/register`,
    login: `${API_BASE}/auth/login`,
    me: `${API_BASE}/auth/me`,
    verify: `${API_BASE}/auth/verify`
  },
  users: {
    all: `${API_BASE}/users`,
    profile: (id) => `${API_BASE}/users/${id}`
  },
  marketplace: {
    items: `${API_BASE}/marketplace/items`,
    item: (id) => `${API_BASE}/marketplace/items/${id}`
  },
  roommate: {
    posts: `${API_BASE}/roommate/posts`
  },
  chat: {
    messages: (roomId) => `${API_BASE}/chat/${roomId}`
  }
};
