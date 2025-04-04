import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate} from 'react-router-dom';
import axios from 'axios';
import AuthContext from './AuthContext';
import ReplyForm from './ReplyForm';
import ReplyList from './ReplyList';
import VoteButtons from './VoteButtons';
import './PostPage.css';


function PostPage() {
  const { channelId, postId } = useParams();
  const { user, getAuthHeaders } = useContext(AuthContext);
  const [post, setPost] = useState(null);
  const [replies, setReplies] = useState([]);
  const navigate = useNavigate();

  // Fetch post and replies
  useEffect(() => {
    fetchData()
  }, [channelId, postId, getAuthHeaders]);

  const fetchReplies = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/channels/${channelId}/posts/${postId}/replies`, { 
          headers: getAuthHeaders() 
      });
      setReplies(response.data);
    } catch (err) {
      console.error('Failed to fetch replies:', err);
    }
  };

  const fetchPost = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/channels/${channelId}/posts/${postId}`, { 
          headers: getAuthHeaders() 
      });
      setPost(response.data);
    } catch (err) {
      console.error('Failed to fetch post:', err);
    }
  }


  const fetchData = async () => {
    try {
      fetchPost();
      fetchReplies();
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  };

  const handleNewReply = (newReply) => {
    setReplies(prev => [...prev, newReply]);
  };

  


  return (
    <div className="post-page">

      <button className="back-button" onClick={() => navigate(`/channels/${channelId}`)}>
        Back
      </button>
      {!post ? (
          <p>Post not found:{post}.</p>
        ) : ( 
        <>
          <div className="post-container">
            <div className="post-header">
              <h1>{post.title}</h1>
              <div className="post-meta">
                <span className="author">By {post.author}</span>
                {new Date(post.created_at).toLocaleString()}
                <VoteButtons 
                contentType="posts" 
                contentId={post.id} 
                initialScore={post.vote_score} 
              />
              </div>
            </div>
            <div className="post-content">
              {post.content}
            </div>
            {post.image_path && (
              <div className="post-image">
                <img src={post.image_path} />
              </div>
            )}
          </div>
          <div className="replies-section">
            <h2>Replies</h2>
            {user && <ReplyForm onReply={handleNewReply} />}
            <ReplyList replies={replies} refreshReplies={fetchReplies} />
          </div>
        </>
      )}

    </div>
  );
};


export default PostPage;