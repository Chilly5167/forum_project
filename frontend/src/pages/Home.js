import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [channels, setChannels] = useState([]);
  const [newChannel, setNewChannel] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');
  const { user, getAuthHeaders } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/channels', {
        headers: getAuthHeaders()
      });
      setChannels(response.data);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewChannel(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    setError('');

    if (!newChannel.name.trim()) {
      setError('Channel name is required');
      return;
    }

    try {
      await axios.post('http://localhost:5000/api/channels', 
        {
          name: newChannel.name,
          description: newChannel.description
        },
        {
          headers: getAuthHeaders()
        }
      );
      setNewChannel({ name: '', description: '' });
      fetchChannels();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create channel');
    }
  };

  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/channels/${channelId}`, {
        headers: getAuthHeaders()
      });
      fetchChannels();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete channel');
    }
  };

  return (
    <div className="home-container">
      <h2>All Channels</h2>
      

      <div className="channel-create-form">
        <h3>Create New Channel</h3>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleCreateChannel}>
          <div className="form-group">
            <label htmlFor="channel-name">Channel Name*</label>
            <input
              id="channel-name"
              type="text"
              name="name"
              value={newChannel.name}
              onChange={handleInputChange}
              placeholder="General Discussion"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="channel-desc">Description</label>
            <textarea
              id="channel-desc"
              name="description"
              value={newChannel.description}
              onChange={handleInputChange}
              placeholder="What's this channel about?"
              rows="3"
            />
          </div>
          <button type="submit" className="create-button">
            Create Channel
          </button>
        </form>
      </div>


      <div className="channels-list">
        {channels.length === 0 ? (
          <p>No channels available yet.</p>
        ) : (
          channels.map(channel => (
            <div key={channel.id} className="channel-card">
              <div 
                className="channel-content"
                onClick={() => navigate(`/channels/${channel.id}`)}
              >
                <h3>{channel.name}</h3>
                <p className="channel-desc">
                  {channel.description || 'No description provided'}
                </p>
                <p className="channel-meta">
                  Created by: {channel.created_by_username || 'Unknown'}
                </p>
              </div>
              
              {user?.is_admin ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteChannel(channel.id);
                  }}
                  className="delete-button"
                >
                  Delete
                </button>
              ) : (<></>)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Home;