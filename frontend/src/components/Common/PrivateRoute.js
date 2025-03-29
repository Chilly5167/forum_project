import React, { useContext} from 'react';
import AuthContext from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
//import { useAuth } from '../../context/AuthContext';

//const { useAuth } = useContext(AuthContext);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);;

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;