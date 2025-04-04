import { useState, useEffect, useContext } from 'react';
import AuthContext from './AuthContext';
import axios from 'axios';

const VoteButtons = ({ contentType, contentId, initialScore}) => {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { getAuthHeaders } = useContext(AuthContext);

  useEffect(() => {
    setScore(initialScore);
  }, [initialScore]);

  const handleVote = async (value) => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const newVote = userVote === value ? 0 : value;
      const response = await axios.post('http://localhost:5000/api/votes', {
        content_type: contentType,
        content_id: contentId,
        vote_value: newVote
      }, {
        headers: getAuthHeaders()
      });
      
      //const data = await response.json();
      if (response.data.success) {
        setScore(response.data.newScore);
        setUserVote(response.data.userVote);
      }
    } catch (err) {
      console.error('Vote failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="vote-buttons">
      <button 
        onClick={() => handleVote(1)}
        disabled={isLoading}
        className={userVote === 1 ? 'active upvote' : 'upvote'}
        aria-label="Upvote"
      >
        ▲
      </button>
      
      <span className="vote-score">{score}</span>
      
      <button 
        onClick={() => handleVote(-1)}
        disabled={isLoading}
        className={userVote === -1 ? 'active downvote' : 'downvote'}
        aria-label="Downvote"
      >
        ▼
      </button>
    </div>
  );
};

export default VoteButtons;