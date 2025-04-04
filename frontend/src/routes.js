import React from 'react';
import Landing from './Landing';
import Home from './Home';
import ChannelPage from './ChannelPage';
import PostPage from './PostPage';
import Login from './Login';
import Register from './Register';
import PrivateRoute from './PrivateRoute';

const routes = [
  {
    path: '/',
    element: <Landing />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/register',
    element: <Register />
  },
  {
    path: '/home',
    element: <PrivateRoute><Home /></PrivateRoute>
  },
  {
    path: '/channels/:channelId',
    element: <PrivateRoute><ChannelPage /></PrivateRoute>
  },
  {
    path: "/channels/:channelId/posts/:postId",
    element: <PrivateRoute><PostPage /></PrivateRoute>
  }
];

export default routes;