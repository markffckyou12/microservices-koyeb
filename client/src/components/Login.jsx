import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './Auth.css';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.identifier) newErrors.identifier = 'Username or Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', formData);
      if (response.data.token) {
        onLogin(response.data.user, response.data.token);
        setMessage('Login successful!');
      } else {
        setMessage(response.data.message || 'Login failed');
      }
    } catch (error) {
      if (error.response?.data?.error) setMessage(error.response.data.error);
      else setMessage('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        {message && <div className={`message ${message.includes('successful') ? 'success' : 'error'}`}>{message}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="identifier">Username or Email</label>
            <input type="text" id="identifier" name="identifier" value={formData.identifier} onChange={handleChange} className={errors.identifier ? 'error' : ''} placeholder="Enter your username or email" disabled={loading} />
            {errors.identifier && <span className="error-text">{errors.identifier}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className={errors.password ? 'error' : ''} placeholder="Enter your password" disabled={loading} />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>
          <button type="submit" className="auth-button" disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <div className="auth-footer">
          <p>Don't have an account? <Link to="/register" className="auth-link">Register here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login; 