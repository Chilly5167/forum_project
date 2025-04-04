import React, { useContext} from 'react';
import AuthContext from './AuthContext';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);;

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;