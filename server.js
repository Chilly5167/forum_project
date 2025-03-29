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
  next();
};


const checkAdmin = (req, res, next) => {
  console.log('checkAdmin User headers:', req.headers); // Debug headers
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
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        is_positive BOOLEAN NOT NULL,
        user_id INT,
        post_id INT NULL,
        reply_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (reply_id) REFERENCES replies(id) ON DELETE CASCADE,
        CONSTRAINT chk_rating_target CHECK (
          (post_id IS NOT NULL AND reply_id IS NULL) OR
          (post_id IS NULL AND reply_id IS NOT NULL)
        )
    )`);
    
    // Create admin user if not exists (with plain text password for demo purposes)
    const [admin] = await connection.query('SELECT * FROM users WHERE is_admin = TRUE LIMIT 1');
    if (admin.length === 0) {
      await connection.query(
        'INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)',
        ['admin', 'admin123', true]
      );
      console.log('Admin user created');
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
        u.username as author,
        (SELECT COUNT(*) FROM ratings WHERE post_id = p.id AND is_positive = true) as upvotes,
        (SELECT COUNT(*) FROM ratings WHERE post_id = p.id AND is_positive = false) as downvotes
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
app.post('api/channels/:channelId/posts', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { title, content } = req.body;
    const userId = req.user.id;

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

// Get a single post with replies
app.get('api/channels/:channelId/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;

    // Get post details
    const [post] = await db.query(`
      SELECT 
        p.*,
        u.username as author,
        (SELECT COUNT(*) FROM ratings WHERE post_id = p.id AND is_positive = true) as upvotes,
        (SELECT COUNT(*) FROM ratings WHERE post_id = p.id AND is_positive = false) as downvotes
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ?
    `, [postId]);

    if (!post.length) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Get nested replies
    const [replies] = await db.query(`
      WITH RECURSIVE ReplyTree AS (
        SELECT 
          r.*,
          u.username as author,
          0 as depth
        FROM replies r
        JOIN users u ON r.user_id = u.id
        WHERE r.post_id = ? AND r.parent_reply_id IS NULL
        
        UNION ALL
        
        SELECT 
          r.*,
          u.username as author,
          rt.depth + 1
        FROM replies r
        JOIN ReplyTree rt ON r.parent_reply_id = rt.id
        JOIN users u ON r.user_id = u.id
      )
      SELECT * FROM ReplyTree
      ORDER BY depth, created_at
    `, [postId]);

    res.json({
      ...post[0],
      replies
    });
    
  } catch (err) {
    console.error('Failed to fetch post:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Delete a post (admin only)
app.delete('api/channels/:channelId/posts/:postId', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { postId } = req.params;

    // First delete ratings to avoid foreign key constraints
    await db.query(
      'DELETE FROM ratings WHERE post_id = ?',
      [postId]
    );

    // Then delete the post
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


// Search Routes
app.get('/api/search', authenticateToken, async (req, res) => {
  try {
    const { query, type } = req.query;
    
    let results;
    switch (type) {
      case 'content':
        const searchTerm = `%${query}%`;
        [results] = await db.query(`
          (SELECT 'post' as type, p.id, p.title, p.content, p.created_at, u.username, c.name as channel_name
          FROM posts p
          JOIN users u ON p.user_id = u.id
          JOIN channels c ON p.channel_id = c.id
          WHERE p.content LIKE ?)
          
          UNION
          
          (SELECT 'reply' as type, r.id, NULL as title, r.content, r.created_at, u.username, NULL as channel_name
          FROM replies r
          JOIN users u ON r.user_id = u.id
          WHERE r.content LIKE ?)
          
          ORDER BY created_at DESC
        `, [searchTerm, searchTerm]);
        break;
        
      case 'user':
        [results] = await db.query(`
          SELECT id, username, created_at
          FROM users
          WHERE username LIKE ?
        `, [`%${query}%`]);
        break;
        
      case 'top_users':
        const order = query === 'most' ? 'DESC' : 'ASC';
        [results] = await db.query(`
          SELECT u.id, u.username, COUNT(p.id) as post_count
          FROM users u
          LEFT JOIN posts p ON u.id = p.user_id
          GROUP BY u.id
          ORDER BY post_count ${order}
          LIMIT 10
        `);
        break;
        
      case 'top_rated':
        const ratingOrder = query === 'highest' ? 'DESC' : 'ASC';
        [results] = await db.query(`
          SELECT u.id, u.username, 
            (SELECT COUNT(*) FROM ratings r 
             JOIN posts p ON r.post_id = p.id 
             WHERE p.user_id = u.id AND r.is_positive = TRUE) +
            (SELECT COUNT(*) FROM ratings r 
             JOIN replies rp ON r.reply_id = rp.id 
             WHERE rp.user_id = u.id AND r.is_positive = TRUE) as upvotes,
            (SELECT COUNT(*) FROM ratings r 
             JOIN posts p ON r.post_id = p.id 
             WHERE p.user_id = u.id AND r.is_positive = FALSE) +
            (SELECT COUNT(*) FROM ratings r 
             JOIN replies rp ON r.reply_id = rp.id 
             WHERE rp.user_id = u.id AND r.is_positive = FALSE) as downvotes
          FROM users u
          ORDER BY (upvotes - downvotes) ${ratingOrder}
          LIMIT 10
        `);
        break;
        
      default:
        results = [];
    }
    
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Admin Routes
app.delete('/api/users/:userId', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    await db.query('DELETE FROM users WHERE id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.delete('/api/channels/:channelId', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { channelId } = req.params;
    await db.query('DELETE FROM channels WHERE id = ?', [channelId]);
    res.json({ success: true });
  } catch (err) {
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