import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate} from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import './PostPage.css';


function PostPage() {
  const { channelId, postId } = useParams();
  const { getAuthHeaders } = useContext(AuthContext);
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState({
    post: true,
    replies: true
  });
  const navigate = useNavigate();

  // Fetch post and replies
  useEffect(() => {
    fetchData()
  }, [channelId, postId, getAuthHeaders]);


  const fetchData = async () => {
    try {
      // Fetch post
      const postRes = await axios.get(`http://localhost:5000/api/channels/${channelId}/posts/${postId}`, {
        headers: getAuthHeaders()
      });
      setPost(postRes.data);


    } catch (err) {
      console.error('Failed to fetch data:', err)
      //navigate('/home');
    } finally {
      setLoading({ post: false, replies: false });
    }
  };




  return (
    <div className="post-page">

      <button className="back-button" onClick={() => navigate(`/channels/${channelId}`)}>
        Back to Channel {channelId}
      </button>
      {!post ? (
          <p>Post not found:{post}.</p>
        ) : ( 
        <>
          <div className="post-container">
            <h1>{post.title}</h1>
            <div className="post-meta">
              <span className="author">By {post.author}</span>
            </div>
            <div className="post-content">
              {post.content}
            </div>
          </div>
          <div className="replies-section">
            <h2>Replies</h2>
          </div>
        </>
      )}

    </div>
  );
};


export default PostPage;