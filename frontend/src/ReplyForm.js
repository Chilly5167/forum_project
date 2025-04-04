import React, { useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import AuthContext from './AuthContext';

const ReplyForm = ({ parentId = null, onReply }) => {
  const [content, setContent] = useState('');
  const { channelId, postId } = useParams();
  const { getAuthHeaders } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `http://localhost:5000/api/channels/${channelId}/posts/${postId}/replies`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ content, parent_id: parentId })
        }
      );
      
      const newReply = await response.json();
      onReply(newReply);
      setContent('');
    } catch (err) {
      console.error('Failed to submit reply:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="reply-form">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={parentId ? 'Write your reply...' : 'Write a new reply...'}
        required
      />
      <button type="submit">Post Reply</button>
    </form>
  );
};

export default ReplyForm;