import React, { useState, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import './Modal.css';

const CreatePost = ({ show, onHide, onPostCreated, channelId }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const { getAuthHeaders } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (image) formData.append('image', image);

    try {
      const response = await fetch(`http://localhost:5000/api/channels/${channelId}/posts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const data = await response.json();
      onPostCreated(data);
      setTitle('');
      setContent('');
      setImage(null);
    } catch (err) {
      setError(err.message || 'Failed to create post');
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Create New Post</h3>
          <button onClick={onHide} className="close-button">&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Content</label>
            <textarea
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Image (Optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files[0])}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-footer">
            <button type="button" onClick={onHide} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;