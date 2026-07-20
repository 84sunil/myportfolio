import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import API_BASE from "../apiConfig";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("sbk_enrolled_courses");
    setUser(null);
    window.location.href = "/";
  }, []);

  const fetchUser = useCallback(async (token) => {
    try {
      const res = await axios.get(`${API_BASE}/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user", err);
      // Optional: Handle refresh token here
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, [fetchUser]);


  const login = async (username, password) => {
    const res = await axios.post(`${API_BASE}/auth/login/`, { username, password });
    localStorage.setItem("accessToken", res.data.access);
    localStorage.setItem("refreshToken", res.data.refresh);
    await fetchUser(res.data.access);
    return true;
  };

  const register = async (username, email, password) => {
    await axios.post(`${API_BASE}/auth/register/`, { username, email, password });
    return login(username, password);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};
