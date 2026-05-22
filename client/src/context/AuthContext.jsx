// client/src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load current user on app start
  useEffect(() => {
    authAPI.me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await authAPI.login({ username, password });
    setUser(res.data);
    return res.data;
  };

  const register = async (username, email, password, avatarBase64 = null) => {
    const res = await authAPI.register({ 
      username, 
      email, 
      password, 
      avatarBase64 
    });
    setUser(res.data);
    return res.data;
  };

  const logout = async () => {
    await authAPI.logout();
    setUser(null);
  };

  // Update avatar (used in Dashboard)
  const updateAvatar = async (base64) => {
    try {
      const res = await authAPI.updateAvatar({ avatarBase64: base64 });
      setUser((prev) => prev ? { ...prev, avatarUrl: res.data.avatarUrl } : null);
      return res.data.avatarUrl;
    } catch (err) {
      console.error("Failed to update avatar:", err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      updateAvatar
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}