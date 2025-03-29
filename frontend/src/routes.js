import React from 'react';
import Landing from './pages/Landing';
import Home from './pages/Home';
import SearchPage from './components/Search/SearchPage';
import ChannelPage from './pages/ChannelPage';
import PostPage from './pages/PostPage';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import PrivateRoute from './components/Common/PrivateRoute';

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
    path: '/search',
    element: <PrivateRoute><SearchPage /></PrivateRoute>
  },
  {
    path: '/channels/:channelId',
    element: <PrivateRoute><ChannelPage /></PrivateRoute>
  },
  {
    path: '/posts/:postId',
    element: <PrivateRoute><PostPage /></PrivateRoute>
  }
];

export default routes;