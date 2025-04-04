import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from './AuthContext';

const Rating = ({ targetId, type, initialRating }) => {
  const [rating, setRating] = useState(initialRating || { upvotes: 0, downvotes: 0 });
  const [userVote, setUserVote] = useState(null);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (initialRating) {
      setRating(initialRating);
    }
  }, [initialRating]);

  const handleVote = async (isPositive) => {
    if (!user) return;

    try {
      const endpoint = type === 'post' 
        ? `/api/rate/post/${targetId}`
        : `/api/rate/reply/${targetId}`;
      
      await axios.post(`http://localhost:5000${endpoint}`, { isPositive }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      // Update local state
      if (userVote === isPositive) {
        // User is removing their vote
        setRating(prev => ({
          upvotes: isPositive ? prev.upvotes - 1 : prev.upvotes,
          downvotes: !isPositive ? prev.downvotes - 1 : prev.downvotes
        }));
        setUserVote(null);
      } else {
        // User is changing or adding their vote
        setRating(prev => ({
          upvotes: isPositive ? prev.upvotes + 1 : prev.upvotes - (userVote !== null ? 1 : 0),
          downvotes: !isPositive ? prev.downvotes + 1 : prev.downvotes - (userVote !== null ? 1 : 0)
        }));
        setUserVote(isPositive);
      }
    } catch (error) {
      console.error('Failed to submit vote:', error);
    }
  };

  return (
    <div className="rating">
      <button 
        className={`btn btn-sm ${userVote === true ? 'btn-success' : 'btn-outline-success'}`}
        onClick={() => handleVote(true)}
        disabled={!user}
      >
        ↑ {rating.upvotes}
      </button>
      <button 
        className={`btn btn-sm ms-1 ${userVote === false ? 'btn-danger' : 'btn-outline-danger'}`}
        onClick={() => handleVote(false)}
        disabled={!user}
      >
        ↓ {rating.downvotes}
      </button>
    </div>
  );
};

export default Rating;