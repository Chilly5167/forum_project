import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import './PostPage.css';

const PostPage = () => {
  const { channelId, postId } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useContext(AuthContext);
  
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [parentReplyId, setParentReplyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch post and replies
  useEffect(() => {
    const fetchPostData = async () => {
      try {
        setLoading(true);
        const [postRes, repliesRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/channels/${channelId}/posts/${postId}`, {
            headers: getAuthHeaders()
          }),
          axios.get(`http://localhost:5000/api/channels/${channelId}/posts/${postId}/replies`, {
            headers: getAuthHeaders()
          })
        ]);
        
        setPost(postRes.data);
        setReplies(repliesRes.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load post');
        navigate(`/channels/${channelId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPostData();
  }, [channelId, postId, getAuthHeaders, navigate]);

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    try {
      const response = await axios.post(
        `http://localhost:5000/api/channels/${channelId}/posts/${postId}/replies`,
        {
          content: newReply,
          parentReplyId: parentReplyId || null
        },
        { headers: getAuthHeaders() }
      );

      setReplies([...replies, response.data]);
      setNewReply('');
      setParentReplyId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post reply');
    }
  };

  const handleVote = async (type, targetId, isPositive) => {
    try {
      await axios.post(
        `http://localhost:5000/api/channels/${channelId}/posts/${postId}/rate/${type}/${targetId}`,
        { isPositive },
        { headers: getAuthHeaders() }
      );
      
      // Update local state
      if (type === 'post') {
        setPost(prev => ({
          ...prev,
          upvotes: isPositive ? prev.upvotes + 1 : prev.upvotes,
          downvotes: !isPositive ? prev.downvotes + 1 : prev.downvotes
        }));
      } else {
        setReplies(prev => prev.map(reply => 
          reply.id === targetId ? {
            ...reply,
            upvotes: isPositive ? reply.upvotes + 1 : reply.upvotes,
            downvotes: !isPositive ? reply.downvotes + 1 : reply.downvotes
          } : reply
        ));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register vote');
    }
  };

  const renderReply = (reply, depth = 0) => (
    <div 
      key={reply.id} 
      className={`reply depth-${depth}`}
      style={{ marginLeft: `${depth * 30}px` }}
    >
      <div className="reply-header">
        <span className="reply-author">{reply.username}</span>
        <span className="reply-date">
          {new Date(reply.created_at).toLocaleString()}
        </span>
      </div>
      <div className="reply-content">{reply.content}</div>
      
      <div className="reply-actions">
        <button 
          className="vote-btn upvote"
          onClick={() => handleVote('reply', reply.id, true)}
        >
          ▲ {reply.upvotes}
        </button>
        <button 
          className="vote-btn downvote"
          onClick={() => handleVote('reply', reply.id, false)}
        >
          ▼ {reply.downvotes}
        </button>
        <button 
          className="reply-btn"
          onClick={() => setParentReplyId(reply.id)}
        >
          Reply
        </button>
      </div>

      {/* Nested replies */}
      {replies
        .filter(r => r.parent_reply_id === reply.id)
        .map(r => renderReply(r, depth + 1))}
    </div>
  );

  if (loading) return <div className="loading">Loading post...</div>;
  if (!post) return <div className="error">Post not found</div>;

  return (
    <div className="post-page">
      <button 
        className="back-button"
        onClick={() => navigate(`/channels/${channelId}`)}
      >
        ← Back to Channel
      </button>

      <div className="post-container">
        <div className="post-header">
          <h1>{post.title}</h1>
          <div className="post-meta">
            <span className="post-author">By {post.username}</span>
            <span className="post-date">
              {new Date(post.created_at).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="post-content">
          <p>{post.content}</p>
        </div>

        <div className="post-votes">
          <button 
            className="vote-btn upvote"
            onClick={() => handleVote('post', post.id, true)}
          >
            ▲ {post.upvotes}
          </button>
          <button 
            className="vote-btn downvote"
            onClick={() => handleVote('post', post.id, false)}
          >
            ▼ {post.downvotes}
          </button>
        </div>
      </div>

      <div className="replies-section">
        <h2>Replies ({replies.length})</h2>
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmitReply} className="reply-form">
          <textarea
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            placeholder={
              parentReplyId 
                ? "Replying to another comment..." 
                : "Write your reply..."
            }
            rows="4"
          />
          <div className="form-actions">
            {parentReplyId && (
              <button 
                type="button" 
                className="cancel-reply"
                onClick={() => setParentReplyId(null)}
              >
                Cancel Reply
              </button>
            )}
            <button type="submit" className="submit-reply">
              Post Reply
            </button>
          </div>
        </form>

        <div className="replies-list">
          {replies
            .filter(reply => !reply.parent_reply_id)
            .map(reply => renderReply(reply))}
        </div>
      </div>
    </div>
  );
};

export default PostPage;