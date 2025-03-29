import React from 'react';
import Rating from '../Common/Rating';

const Reply = ({ reply, onReply }) => {
  const marginLeft = reply.depth * 30;
  
  return (
    <div 
      className="card mb-3" 
      style={{ marginLeft: `${marginLeft}px`, borderLeft: marginLeft > 0 ? '3px solid #0d6efd' : 'none' }}
    >
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="card-text">{reply.content}</p>
            {reply.image_path && (
              <img 
                src={`http://localhost:5000/${reply.image_path}`} 
                alt="Reply" 
                className="img-thumbnail mt-2"
                style={{ maxWidth: '200px' }}
              />
            )}
          </div>
          <Rating 
            targetId={reply.id}
            type="reply"
            initialRating={{ upvotes: reply.upvotes, downvotes: reply.downvotes }}
          />
        </div>
        <div className="d-flex justify-content-between mt-3">
          <div>
            <button 
              className="btn btn-sm btn-outline-primary me-2"
              onClick={() => onReply(reply.id)}
            >
              Reply
            </button>
            <small className="text-muted">
              by {reply.username || 'unknown'}
            </small>
          </div>
          <small className="text-muted">
            {new Date(reply.created_at).toLocaleString()}
          </small>
        </div>
      </div>
    </div>
  );
};

export default Reply;