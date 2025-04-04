import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import ReplyForm from './ReplyForm';
import VoteButtons from './VoteButtons';
import AuthContext from './AuthContext';
import axios from 'axios';

const ReplyList = ({ replies, refreshReplies, depth = 0 }) => {
  const { channelId, postId } = useParams();
  const { getAuthHeaders, user } = useContext(AuthContext);
  const [localReplies, setLocalReplies] = useState(replies);

  // Sync with parent component's replies
  useEffect(() => {
    setLocalReplies(replies);
  }, [replies]);

  const handleNewReply = async (newReply, parentId = null) => {
    try {
      // Optimistically update UI
      setLocalReplies(prev => {
        if (!parentId) return [...prev, newReply];
        return addReplyToTree(prev, parentId, newReply);
      });

      // Verify with server
      await refreshReplies();
    } catch (err) {
      console.error('Reply creation failed:', err);
      setLocalReplies(replies); // Revert on error
    }
  };

  const uploadImage = async () => {
      console.log("uploadImage");
      
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

  const handleDeleteReply = async (replyId) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    try {
      // Optimistically update UI
      setLocalReplies(prev => removeReplyFromTree(prev, replyId));

      // Delete from server
      await axios.delete(
        `http://localhost:5000/api/channels/${channelId}/posts/${postId}/replies/${replyId}`,
        { headers: getAuthHeaders() }
      );

      // Verify with server
      await refreshReplies();
    } catch (err) {
      console.error('Failed to delete reply:', err);
      setLocalReplies(replies); // Revert on error
    }
  };

  // Helper function to add reply to nested tree
  const addReplyToTree = (replyList, parentId, newReply) => {
    return replyList.map(reply => {
      if (reply.id === parentId) {
        return {
          ...reply,
          replies: [...(reply.replies || []), newReply]
        };
      }
      if (reply.replies?.length) {
        return {
          ...reply,
          replies: addReplyToTree(reply.replies, parentId, newReply)
        };
      }
      return reply;
    });
  };

  // Helper function to remove reply from nested tree
  const removeReplyFromTree = (replyList, targetId) => {
    return replyList
      .filter(reply => reply.id !== targetId)
      .map(reply => ({
        ...reply,
        replies: reply.replies ? removeReplyFromTree(reply.replies, targetId) : []
      }));
  };

  // Component for individual reply
  const Reply = ({ reply, depth }) => {
    return (
      <div className={`reply depth-${depth}`}>
        <div className="reply-header">
          <VoteButtons 
              contentType="replies" 
              contentId={reply.id} 
              initialScore={reply.vote_score} 
          />
          <span className="author">created by: {reply.author}</span>
          <span className="meta">
            at {new Date(reply.created_at).toLocaleString()}
          </span>
          {user?.is_admin ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteReply(reply.id);
              }}
              className="delete-button"
            >
              Delete
            </button>
          ) : (<></>)}
        </div>
        <div className="reply-content">{reply.content}</div>
        
        

        <ReplyForm
          parentId={reply.id}
          onReply={(newReply) => handleNewReply(newReply, reply.id)}
        />

        {reply.replies?.length > 0 && (
          <ReplyList 
            replies={reply.replies} 
            refreshReplies={refreshReplies}  // Crucial: Pass down to nested replies
            depth={depth + 1}
          />
        )}
      </div>
    );
  };

  return (
    <div className={`replies-container`}>
      {localReplies.map(reply => (
        <div className={`reply depth-${depth}`}
        style={{ marginLeft: `${depth * 20}px` }}
        key={reply.id}>
          <Reply 
            reply={reply}
            depth={depth}
          />
        </div>
      ))}
    </div>
  );
};

export default ReplyList;