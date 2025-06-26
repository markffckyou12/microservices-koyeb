import { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setProfileData(response.data.user);
      } else {
        setError('Failed to fetch profile data');
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
      setError('Error fetching profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-card">
          <h2>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <h2>Welcome to Your Dashboard</h2>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="user-info">
          <h3>User Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Name:</label>
              <span>{user?.name || 'Not provided'}</span>
            </div>
            <div className="info-item">
              <label>Email:</label>
              <span>{user?.email}</span>
            </div>
            <div className="info-item">
              <label>User ID:</label>
              <span>{user?.id}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-content">
          <h3>Account Status</h3>
          <p>Your account is active and you are successfully logged in.</p>
          
          <div className="status-indicators">
            <div className="status-item success">
              <span className="status-dot"></span>
              <span>Authentication: Active</span>
            </div>
            <div className="status-item success">
              <span className="status-dot"></span>
              <span>Session: Valid</span>
            </div>
            <div className="status-item success">
              <span className="status-dot"></span>
              <span>Database: Connected</span>
            </div>
          </div>
        </div>

        <div className="dashboard-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-button" onClick={fetchProfile}>
              Refresh Profile
            </button>
            <button className="action-button secondary">
              Edit Profile (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 