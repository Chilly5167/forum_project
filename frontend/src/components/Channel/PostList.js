import React from 'react';
import { Link } from 'react-router-dom';
import Rating from '../Common/Rating';


const PostList = ({ posts }) => {
  return (
    <div className="post-list">
      {posts.length === 0 ? (
        <div className="alert alert-info">No posts found.</div>
      ) : (
        <div className="list-group">
          {posts.map(post => (
            <div key={post.id} className="list-group-item">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <Link to={`/channels/${post.channel_id}/posts/${post.id}`} className="text-decoration-none">
                    <h5>{post.title}</h5>
                  </Link>
                  <p className="mb-1">{post.content}</p>
                  {post.image_path && (
                    <img 
                      src={`http://localhost:5000/${post.image_path}`} 
                      alt="Post" 
                      className="img-thumbnail mt-2"
                      style={{ maxWidth: '200px' }}
                    />
                  )}
                </div>
                <Rating 
                  targetId={post.id}
                  type="post"
                  initialRating={{ upvotes: post.upvotes, downvotes: post.downvotes }}
                />
              </div>
              <div className="d-flex justify-content-between mt-2">
                <small className="text-muted">
                  Posted by {post.username || 'unknown'}
                </small>
                <small className="text-muted">
                  {new Date(post.created_at).toLocaleString()}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostList;