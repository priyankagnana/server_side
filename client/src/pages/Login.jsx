import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import './login.css';

const Login = ({ darkMode }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('userEmail');
    const wasRemembered = localStorage.getItem('rememberMe');
    if (rememberedEmail && wasRemembered === 'true') {
      setFormData(prev => ({ ...prev, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    const API_BASE = import.meta.env.VITE_API_URL;
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('authToken', data.token);
        storage.setItem('user', JSON.stringify(data.user));

        if (data.expiresIn) {
          const expiryTime = new Date();
          if (data.expiresIn.includes('d')) {
            const days = parseInt(data.expiresIn.replace('d', ''));
            expiryTime.setDate(expiryTime.getDate() + days);
          } else if (data.expiresIn.includes('h')) {
            const hours = parseInt(data.expiresIn.replace('h', ''));
            expiryTime.setHours(expiryTime.getHours() + hours);
          }
          storage.setItem('tokenExpiry', expiryTime.toISOString());
        }

        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('userEmail', formData.email);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('userEmail');
        }

        console.log('Login successful:', data.message);
        navigate('/', { replace: true });
      } else {
        if (data.code === 'EMAIL_NOT_VERIFIED') {
          setError(`${data.message} Please verify your email.`);
        } else {
          setError(data.message || 'Login failed. Please try again.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setError('Unable to connect to server. Please check your internet connection.');
      } else if (error.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = () => setShowPassword(prev => !prev);

  return (
    <div className={`login-container ${darkMode ? 'dark' : 'light'}`}>
      <div className={`login-card ${darkMode ? 'dark' : 'light'}`}>
        <div className="login-header">
          <div className="lock-icon">
            <Lock size={26} color="#2563eb" />
          </div>
          <h1>Sign in with email</h1>
          <p>Make a new doc to bring your words, data, and teams together — for free.</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className={`input-group ${darkMode ? 'dark' : 'light'}`}>
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
            />
          </div>

          <div className={`input-group ${darkMode ? 'dark' : 'light'}`}>
            <Lock size={18} className="input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={togglePassword}
              disabled={loading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
              /> Remember Me
            </label>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Get Started'}
          </button>
        </form>

        <div className="divider">Or sign in with</div>

        <div className="social-login">
          <button className="social-btn">
            <img src="/google.svg" alt="Google" width="20" height="20" />
          </button>
          <button className="social-btn">
            <img src="/apple.svg" alt="Apple" width="20" height="20" />
          </button>
        </div>

        <div className="login-footer">
          Don’t have an account?
          <Link to="/signup"> Create one</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
