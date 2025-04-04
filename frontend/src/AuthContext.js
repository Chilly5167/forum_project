import React, { createContext, useState, useEffect, useContext} from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username,
        password
      });
      
      const userData = response.data.user;

      console.log("Login Response:", userData);

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Login failed' };
    }
  };

  const register = async (username, password) => {
    try {
      await axios.post('http://localhost:5000/api/register', {
        username,
        password
      });
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Registration failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const getAuthHeaders = () => {
    if (!user) return {};
    return {
      'x-user-id': user.id,
      'x-username': user.username,
      'x-is-admin': user.is_admin.toString()
    };
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout,
      getAuthHeaders
    }}>
      {children}
    </AuthContext.Provider>
  );
};


export default AuthContext;