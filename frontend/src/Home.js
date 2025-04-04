import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from './AuthContext';
import axios from 'axios';
import './Home.css';

const Home = () => {
  const [channels, setChannels] = useState([]);
  const [newChannelTitle, setNewChannelTitle] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
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


  const createChannel = async () => {
    try {
      await axios.post(`http://localhost:5000/api/channels`, {
        name: newChannelTitle,
        description: newChannelDescription
      }, {
        headers: getAuthHeaders()
      });
      setNewChannelTitle('');
      setNewChannelDescription('');
      fetchChannels();
    } catch (error) {
      console.error('Failed to create channel:', error);
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
        {error && <div className="error-message">{error}</div>}

        <div className="create-post">
            <h3>Create New Channel</h3>
            <input
              type="text"
              value={newChannelTitle}
              onChange={(e) => setNewChannelTitle(e.target.value)}
              placeholder="Channel Name"
            />
            <textarea
              value={newChannelDescription}
              onChange={(e) => setNewChannelDescription(e.target.value)}
              placeholder="Channel Description here ..."
            />
            <button onClick={createChannel}>Create Channel</button>
          </div>

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
                  {channel.description || ''}
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