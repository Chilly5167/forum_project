import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="landing">
      <div className="dark-overlay">
        <div className="landing-inner">
          <h1 className="display-4">Forum App</h1>
          <p className="lead">
            A platform to discuss topics, share ideas, and connect with others through channels, posts, and replies.
          </p>
          <div className="buttons">
            <Link to="/register" className="btn btn-primary me-2">Sign Up</Link>
            <br></br>
            <Link to="/login" className="btn btn-light">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;