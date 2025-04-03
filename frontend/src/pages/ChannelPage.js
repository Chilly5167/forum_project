import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import './ChannelPage.css';

const ChannelPage = () => {
  const { channelId } = useParams();
  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const { user, getAuthHeaders } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChannelAndPosts();
  }, [channelId]);

  const fetchChannelAndPosts = async () => {
    try {
      console.log(`ChannelPage.js fetch - axios.get(http://localhost:5000/api/channels/${channelId})
        axios.get(http://localhost:5000/api/channels/${channelId}/posts)`);
      const [channelRes, postsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/channels/${channelId}`, {
          headers: getAuthHeaders()
        }),
        axios.get(`http://localhost:5000/api/channels/${channelId}/posts`, {
          headers: getAuthHeaders()
        })
      ]);
      setChannel(channelRes.data);
      setPosts(postsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      navigate('/home');
    }
  };

  const createPost = async () => {
    try {
      console.log(`ChannelPage.js - createPost() - axios.post(http://localhost:5000/api/channels/${channelId}/posts)`);
      await axios.post(`http://localhost:5000/api/channels/${channelId}/posts`, {
        title: newPostTitle,
        content: newPostContent
      }, {
        headers: getAuthHeaders()
      });
      setNewPostTitle('');
      setNewPostContent('');
      console.log("Before fetchChannelAndPosts() in createPost() in ChannelPage.js");
      fetchChannelAndPosts();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/channels/${channelId}/posts/${postId}`, {
        headers: getAuthHeaders()
      });
      fetchChannelAndPosts();
    } catch (err) {
      console.error('Failed to delete post');
    }
  };

  return (
    <div className="channel-page">
      {channel && (
        <>
          <div className="channel-header">
            <h2>{channel.name}</h2>
            <p>{channel.description}</p>
          </div>

          <div className="create-post">
            <h3>Create New Post</h3>
            <input
              type="text"
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              placeholder="Post title"
            />
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Write your post here..."
            />
            <button onClick={createPost}>Submit Post</button>
          </div>

          <div className="posts-list">
            <h3>Posts</h3>
            {posts.map(post => (
              <div 
                key={post.id} 
                className="post-card"
              >
                <div className="post-content" onClick={() => navigate(`/channels/${channelId}/posts/${post.id}`)}>
                  <h4>{post.title}</h4>
                  <p>{post.content.substring(0, 100)}...</p>
                  <div className="post-meta">
                    <span>By {post.author}</span>
                    <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {user?.is_admin ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePost(post.id);
                    }}
                    className="delete-button"
                  >
                    Delete
                  </button>
                ) : (<></>)}

              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ChannelPage;