import React from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  return (
    <div className="landing">
      <div className="dark-overlay">
        <div className="landing-inner">
          <h1 className="display-4">Forum App</h1>
          <p className="lead">
            This application is designed to be a channel based forum for discussing programming questions
            In this application users can
            - create/view channels
            - create/view posts
            - create/view replies to posts, and other replies
            -  and much more
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