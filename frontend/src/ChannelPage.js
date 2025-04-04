import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import AuthContext from './AuthContext';
import axios from 'axios';
import VoteButtons from './VoteButtons';
import './ChannelPage.css';

const ChannelPage = () => {
  const { channelId } = useParams();
  const [channel, setChannel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [imagePath, setImagePath] = useState(null);
  const { user, getAuthHeaders } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchChannelAndPosts();
  }, [channelId]);

  const fetchChannelAndPosts = async () => {
    try {
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
      const uploadedImagePath = postImage ? await uploadImage() : null;
      await axios.post(`http://localhost:5000/api/channels/${channelId}/posts`, {
        title: newPostTitle,
        content: newPostContent,
        image_path: uploadedImagePath
      }, {
        headers: getAuthHeaders()
      });
      setNewPostTitle('');
      setNewPostContent('');
      setPostImage(null);
      setImagePath(null);
      fetchChannelAndPosts();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const uploadImage = async () => {
    console.log("uploadImage");
    //if (!postImage) return null;
    
    try {
      const formData = new FormData();
      formData.append('image', postImage);
      
      const response = await axios.post('http://localhost:5000/api/upload', formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data.path;
    } catch (error) {
      console.error('Upload failed:', postImage, error);
      return null;
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
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setPostImage(e.target.files[0]);
                setImagePath(URL.createObjectURL(e.target.files[0]));
              }}
            />
            {imagePath && (
              <div>
                <img 
                  src={imagePath} 
                  alt="Preview" 
                  style={{ maxWidth: '200px', maxHeight: '200px' }}
                />
                <button onClick={() => {
                  setPostImage(null);
                  setImagePath(null);
                }}>
                  Remove Image
                </button>
              </div>
            )}
            <button onClick={createPost}>Submit Post</button>
          </div>

          <div className="posts-list">
            <h3>Posts</h3>
            {posts.map(post => (
              <div key={post.id} className="post-card">
                <div className="vote-section">
                  <VoteButtons 
                    contentType="posts"
                    contentId={post.id}
                    initialScore={post.vote_score}
                  />
                </div>
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