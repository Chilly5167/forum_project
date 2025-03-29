import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../../context/AuthContext';

const ChannelList = () => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getAuthHeaders } = useContext(AuthContext);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/channels', {
          headers: getAuthHeaders()
        });
        console.log("Made it past axios.get(api/channels)");
        setChannels(response.data);
      } catch (error) {
        console.error('Failed to fetch channels:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChannels();
  }, [getAuthHeaders]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="channel-list">
      {channels.length === 0 ? (
        <div className="alert alert-info">No channels found. Create one to get started!</div>
      ) : (
        <div className="list-group">
          {channels.map(channel => (
            <Link 
              key={channel.id}
              to={`/channels/${channel.id}`}
              className="list-group-item list-group-item-action"
            >
              <div className="d-flex justify-content-between">
                <h5>{channel.name}</h5>
                <small className="text-muted">
                  Created by {channel.created_by_username || 'unknown'}
                </small>
              </div>
              {channel.description && (
                <p className="mb-1">{channel.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChannelList;