import React, { useState, useContext } from 'react';
import AuthContext from '../../context/AuthContext';
import './Search.css';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('content');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { getAuthHeaders } = useContext(AuthContext);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/search?query=${query}&type=${activeTab}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const renderResults = () => {
    if (loading) return <div className="loading">Loading...</div>;
    if (results.length === 0) return <div className="no-results">No results found</div>;

    switch (activeTab) {
      case 'content':
        return (
          <div className="results-list">
            {results.map((item, index) => (
              <div key={index} className="result-item">
                <h4>{item.title || 'Reply'}</h4>
                <p>{item.content}</p>
                <div className="result-meta">
                  <span>by {item.username}</span>
                  {item.channel_name && <span>in {item.channel_name}</span>}
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        );
      // Add other cases for different search types
      default:
        return null;
    }
  };

  return (
    <div className="search-page">
      <h2>Search</h2>
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      
      <div className="tabs">
        <button
          className={activeTab === 'content' ? 'active' : ''}
          onClick={() => setActiveTab('content')}
        >
          Content
        </button>
        <button
          className={activeTab === 'user' ? 'active' : ''}
          onClick={() => setActiveTab('user')}
        >
          Users
        </button>
      </div>
      
      {renderResults()}
    </div>
  );
};

export default SearchPage;