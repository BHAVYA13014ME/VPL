import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
  profile?: {
    profilePicture?: string;
    phone?: string;
    bio?: string;
    location?: string;
    department?: string;
    specialization?: string;
    experience?: string;
    skills?: string[];
    achievements?: any[];
    socialLinks?: {
      linkedin?: string;
      twitter?: string;
      github?: string;
    };
  };
  createdAt?: string;
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
    profileVisibility: 'public' | 'private' | 'students-only';
  };
  gamificationStats: {
    totalPoints: number;
    badges: string[];
    level: number;
    streak: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  updateUser: (userData: Partial<User>) => void;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'teacher' | 'student';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set up axios defaults
const API_BASE_URL = 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Safe user data sanitization function
  const sanitizeUserData = (userData: any): User => {
    return {
      _id: userData._id || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      fullName: userData.fullName || (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : ''),
      email: userData.email || '',
      role: userData.role || 'student',
      profile: {
        profilePicture: userData.profile?.profilePicture || userData.profilePicture || '',
        phone: userData.profile?.phone || '',
        bio: userData.profile?.bio || '',
        location: userData.profile?.location || '',
        department: userData.profile?.department || '',
        specialization: userData.profile?.specialization || '',
        experience: userData.profile?.experience || '',
        skills: userData.profile?.skills || [],
        achievements: userData.profile?.achievements || [],
        socialLinks: userData.profile?.socialLinks || {
          linkedin: '',
          twitter: '',
          github: '',
        },
      },
      createdAt: userData.createdAt || '',
      preferences: userData.preferences || {
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false,
        profileVisibility: 'public',
      },
      gamificationStats: {
        totalPoints: userData.gamificationStats?.totalPoints || userData.gamification?.points || 0,
        badges: userData.gamificationStats?.badges || userData.gamification?.badges || [],
        level: userData.gamificationStats?.level || userData.gamification?.level || 1,
        streak: userData.gamificationStats?.streak || userData.gamification?.streak || 0,
      },
    };
  };

  // Safe setUser function
  const setSafeUser = (userData: any) => {
    if (userData) {
      const sanitizedUser = sanitizeUserData(userData);
      setUser(sanitizedUser);
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      fetchUserProfile();
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setSafeUser(response.data.user);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log('Attempting login with:', { email, API_BASE_URL });
      const response = await axios.post('/api/auth/login', { email, password });
      console.log('Login response:', response.data);
      
      const { token: newToken, user: userData } = response.data.data || response.data;
      
      setToken(newToken);
      setSafeUser(userData);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      console.error('Login error:', error);
      console.error('Error response:', error.response);
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    try {
      setIsLoading(true);
      console.log('Attempting registration with:', userData);
      const response = await axios.post('/api/auth/register', userData);
      console.log('Registration response:', response.data);
      
      const { token: newToken, user: newUser } = response.data.data || response.data;
      
      setToken(newToken);
      setSafeUser(newUser);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response);
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setSafeUser(updatedUser);
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthContext };
