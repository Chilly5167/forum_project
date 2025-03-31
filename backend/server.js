require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true
}));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Database connection
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'forum_app',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Simple authentication middleware (replacing JWT)
const authenticateToken = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const username = req.headers['x-username'];
  const isAdmin = req.headers['x-is-admin'] === '1';
  
  if (!userId || !username) {
    console.log("!userId || !username == false");
    return res.sendStatus(401);
  }

  req.user = { id: userId, username, is_admin: isAdmin };
  //console.log("athenticateToken:", Object.keys(req));
  //console.log("athenticateToken:", req.method, req.url);
  next();
};


const checkAdmin = (req, res, next) => {
  //console.log('checkAdmin User headers:', req.headers); // Debug headers
  const isAdmin = req.headers['x-is-admin'] === '1';
  
  if (!isAdmin) return res.sendStatus(403);
  next();
};

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Initialize database
async function initializeDatabase() {
  try {
    const connection = await db.getConnection();
    
    // Create tables if they don't exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        image_path VARCHAR(255),
        channel_id INT,
        user_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        content TEXT NOT NULL,
        image_path VARCHAR(255),
        post_id INT,
        user_id INT,
        parent_reply_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_reply_id) REFERENCES replies(id) ON DELETE CASCADE
      )
    `);

    
    // Create admin user if not exists (with plain text password for demo purposes)
    const [admin] = await connection.query('SELECT * FROM users WHERE is_admin = TRUE LIMIT 1');
    if (admin.length === 0) {
      await connection.query(
        'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
        ['admin', 'admin123', true]
      );
    }
    
    connection.release();
  } catch (err) {
    console.error('Database initialization error:', err);
  }
}

// Routes

// Auth Routes (simplified without bcrypt and JWT)
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const connection = await db.getConnection();
    const [result] = await connection.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, password] // Storing plain text password (not recommended for production)
    );
    connection.release();
    
    res.status(201).json({ id: result.insertId, username });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const connection = await db.getConnection();
    const [users] = await connection.query(
      'SELECT * FROM users WHERE username = ? AND password = ?',
      [username, password] // Simple password check (not secure)
    );
    connection.release();
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    res.json({ 
      user: { 
        id: user.id, 
        username: user.username, 
        is_admin: user.is_admin 
      } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Channel Routes
app.get('/api/channels', authenticateToken, async (req, res) => {
  try {
    const [channels] = await db.query(`
      SELECT c.*, u.username as created_by_username 
      FROM channels c
      LEFT JOIN users u ON c.created_by = u.id
      ORDER BY c.created_at DESC
    `);
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

app.post('/api/channels', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const [result] = await db.query(
      'INSERT INTO channels (name, description, created_by) VALUES (?, ?, ?)',
      [name, description, req.user.id]
    );
    res.status(201).json({ id: result.insertId, name, description });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// GET single channel
app.get('/api/channels/:channelId', authenticateToken, async (req, res) => {
  try {
    const [channel] = await db.query(`
      SELECT c.*, u.username as created_by_username 
      FROM channels c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `, [req.params.channelId]);
    
    if (!channel[0]) return res.status(404).json({ error: 'Channel not found' });
    res.json(channel[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});



// Get all posts in a channel
app.get('/api/channels/:channelId/posts', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    
    // Validate channel exists
    const [channel] = await db.query(
      'SELECT id FROM channels WHERE id = ?', 
      [channelId]
    );
    
    if (!channel.length) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Get posts with author info and ratings
    const [posts] = await db.query(`
      SELECT 
        p.id,
        p.title,
        p.content,
        p.created_at,
        u.username as author
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.channel_id = ?
      ORDER BY p.created_at DESC
    `, [channelId]);

    res.json(posts);
    
  } catch (err) {
    console.error('Failed to fetch posts:', err);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new post
app.post('/api/channels/:channelId/posts', authenticateToken, async (req, res) => {
  //console.log("post - api/channels/:channels/channelId/posts")
  try {
    const { channelId } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

    //console.log(`req.params: ${req.params}, req.body: ${req.body}, req.user.id: ${req.user.id}`);

    // Validation
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    // Verify channel exists
    const [channel] = await db.query(
      'SELECT id FROM channels WHERE id = ?', 
      [channelId]
    );
    
    if (!channel.length) {
      console.log("channel.length == 0, channel:", channel);
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Create post
    const [result] = await db.query(
      `INSERT INTO posts 
        (title, content, channel_id, user_id) 
       VALUES (?, ?, ?, ?)`,
      [title, content, channelId, userId]
    );

    // Return the created post
    const [newPost] = await db.query(
      `SELECT 
        p.*,
        u.username as author
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    res.status(201).json(newPost[0]);
    
  } catch (err) {
    console.error('Failed to create post:', err);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get a specific post from a channel
app.get('/api/channels/:channelId/posts/:postId', authenticateToken, async (req, res) => {
  try {
    //console.log("get(/api/channels/:channelId/posts/:postId)");
    const { channelId, postId } = req.params;
    const userId = req.user.id;

    //console.log("req.params: ", req.params, "userId:", req.user.id);

    // Verify channel exists
    const [channel] = await db.query(
      'SELECT id FROM channels WHERE id = ?',
      [channelId]
    );
    
    if (!channel.length) {
      console.log("!channel.length, sending 404");
      return res.status(404).json({ error: 'Channel not found' });
    }

    //(SELECT COALESCE(SUM(vote_value), 0) FROM ratings WHERE content_type = 'post' AND content_id = p.id) as vote_score,
    //(SELECT vote_value FROM votes WHERE user_id = ? AND content_type = 'post' AND content_id = p.id) as user_vote

    // Get post with author info and vote status
    const [post] = await db.query(`
      SELECT 
        p.*,
        u.username as author
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.channel_id = ?
    `, [postId, channelId]);

    //console.log("post: ", post);

    if (!post.length) {
      console.log("!post.length, sending 404 post not found");
      return res.status(404).json({ error: 'Post not found in this channel' });
    }

    //console.log("post[0]: ", post[0])

    res.json(post[0]);
  } catch (err) {
    console.error('Failed to fetch post:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});



app.get('/api/channels')

// Search Routes
app.get('/api/search', authenticateToken, async (req, res) => {
  // Complete this later
});


// Admin Routes

// Delete a post (admin only)
app.delete('/api/channels/:channelId/posts/:postId', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { postId } = req.params;

    const [result] = await db.query(
      'DELETE FROM posts WHERE id = ?',
      [postId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.sendStatus(204);
    
  } catch (err) {
    console.error('Failed to delete post:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Delete a user (admin only)
app.delete('/api/users/:userId', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const [result] = await db.query(
      'DELETE FROM users WHERE id = ?', 
      [userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'user not found' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('Failed to delete user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Delete a channel (admin only)
app.delete('/api/channels/:channelId', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { channelId } = req.params;
    const [result] = await db.query(
      'DELETE FROM channels WHERE id = ?', 
      [channelId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'channel not found' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('Failed to delete channel:', err);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});



// Initialize and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
  });
});