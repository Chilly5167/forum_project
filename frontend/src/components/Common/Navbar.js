import React, { useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';


const Navbar = () => {
  const { user, logout } = useContext(AuthContext);;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };


  return (
    <nav className="navbar">
      <div className="container">
        <Link className="navbar-landing" to="/">Forum App</Link>
        <ul className="navbar-nav">
          {user && (
            <>
              <li className="nav-item">
                <Link className="nav-link" to="/home">Home</Link>
              </li>
            </>
          )}
        </ul>
        <ul className="navbar-nav">
          {user ? (
            <>
              <span className="username">
                Current User: {user.username}
                {user.is_admin ? ' (Admin)' : ''}
              </span>
              <li className="nav-item">
                <Link className="nav-link" to="/search">Search</Link>
              </li>
              <li className="nav-item">
                <button className="btn btn-outline-light" onClick={handleLogout}>Logout</button>
              </li>
            </>
          ) : (
            <>
              <li className="nav-item">
                <Link className="nav-link" to="/login">Login</Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/register">Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;