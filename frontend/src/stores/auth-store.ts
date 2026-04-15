import { create } from "zustand";
import { API, type AuthUser } from "@/api";
import { clearToken, getToken, setToken as saveToken } from "@/utils/auth";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (token: string, user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    const token = getToken();
    if (!token) {
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      return;
    }

    set({ token, isLoading: true });
    try {
      const user = await API.getMe();
      if (getToken() !== token) {
        return;
      }
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch {
      if (getToken() !== token) {
        return;
      }
      clearToken();
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: (token, user) => {
    saveToken(token);
    set({ token, user, isAuthenticated: true, isLoading: false });
  },

  updateUser: (user) => {
    set({ user });
  },

  logout: () => {
    clearToken();
    set({ token: null, user: null, isAuthenticated: false, isLoading: false });
  },
}));
