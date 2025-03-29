import React, { useState, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import './Modal.css';

const CreateChannel = ({ show, onHide, onChannelCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const { getAuthHeaders } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch('http://localhost:5000/api/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ name, description })
      });
      const data = await response.json();
      onChannelCreated(data);
      setName('');
      setDescription('');
    } catch (err) {
      setError(err.message || 'Failed to create channel');
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Channel</h3>
          <button onClick={onHide} className="close-button">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Channel Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-footer">
            <button type="button" onClick={onHide} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChannel;