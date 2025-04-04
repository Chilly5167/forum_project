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

app.use(express.static(path.join(__dirname)));

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
  const isAdmin = req.headers['x-is-admin'] === '1';
  
  if (!isAdmin) return res.sendStatus(403);
  next();
};


// Configure Multer
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Create the uploads directory if it doesn't exist
const publicReactDir = __dirname.replace(path.basename(__dirname), '') + "frontend/public";
const uploadDir = path.join(publicReactDir, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

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
        vote_score INT DEFAULT 0,
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
        channel_id INT,
        user_id INT,
        parent_id INT NULL,
        vote_score INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_id) REFERENCES replies(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        content_type ENUM('posts', 'replies') NOT NULL,
        content_id INT NOT NULL,
        vote_value TINYINT NOT NULL COMMENT '1 for upvote, -1 for downvote',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        CONSTRAINT unique_vote UNIQUE (user_id, content_type, content_id)
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

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const connection = await db.getConnection();
    const [result] = await connection.query(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, password]
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
      [username, password]
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
        p.vote_score,
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

  try {
    const { channelId } = req.params;
    let { title, content, image_path } = req.body;
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
      console.log("channel.length == 0, channel:", channel);
      return res.status(404).json({ error: 'Channel not found' });
    }

    if (!image_path) {
      console.log("Empty imagePath, setting to null")
      image_path = null;
    }

    // Create post
    const [result] = await db.query(
      `INSERT INTO posts 
        (title, content, channel_id, user_id, image_path) 
       VALUES (?, ?, ?, ?, ?)`,
      [title, content, channelId, userId, image_path]
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
    const { channelId, postId } = req.params;
    const userId = req.user.id;

    // Verify channel exists
    const [channel] = await db.query(
      'SELECT id FROM channels WHERE id = ?',
      [channelId]
    );
    
    if (!channel.length) {
      console.log("!channel.length, sending 404");
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Get post with author info and vote status
    const [post] = await db.query(`
      SELECT 
        p.*,
        u.username as author
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = ? AND p.channel_id = ?
    `, [postId, channelId]);

    if (!post.length) {
      console.log("!post.length, sending 404 post not found");
      return res.status(404).json({ error: 'Post not found in this channel' });
    }

    res.json(post[0]);
  } catch (err) {
    console.error('Failed to fetch post:', err);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});


// Get replies for a post (with nesting)
app.get('/api/channels/:channelId/posts/:postId/replies', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const [replies] = await db.query(`
      SELECT r.*, u.username as author
      FROM replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.post_id = ?
      ORDER BY r.created_at ASC
    `, [postId]);

    // Build nested structure
    const nestReplies = (replies, parentId = null) => {
      return replies
        .filter(reply => reply.parent_id === parentId)
        .map(reply => ({
          ...reply,
          replies: nestReplies(replies, reply.id)
        }));
    };

    res.json(nestReplies(replies));
  } catch (err) {
    console.error('Failed to fetch replies:', err);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// Create a new reply
app.post('/api/channels/:channelId/posts/:postId/replies', authenticateToken, async (req, res) => {
  try {
    const { channelId, postId } = req.params;
    const { content, parent_id } = req.body;
    const userId = req.user.id;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const [result] = await db.query(`
      INSERT INTO replies (content, user_id, post_id, channel_id, parent_id)
      VALUES (?, ?, ?, ?, ?)
    `, [content, userId, postId,channelId, parent_id || null]);

    // Get the full reply with author info
    const [newReply] = await db.query(`
      SELECT r.*, u.username as author
      FROM replies r
      JOIN users u ON r.user_id = u.id
      WHERE r.id = ?
    `, [result.insertId]);

    res.status(201).json(newReply[0]);
  } catch (err) {
    console.error('Failed to create reply:', err);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});


// Handle voting
app.post('/api/votes', authenticateToken, async (req, res) => {
  try {
    const { content_type, content_id, vote_value } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!['posts', 'replies'].includes(content_type) || 
        ![-1, 0, 1].includes(vote_value)) {
      return res.status(400).json({ error: 'Invalid vote data' });
    }

    // Check if content exists
    const table = content_type; // posts or replies
    const [content] = await db.query(
      `SELECT id FROM ${table} WHERE id = ?`,
      [content_id]
    );
    
    if (!content.length) {
      return res.status(404).json({ error: 'Content not found' });
    }

    // Insert or update vote
    await db.query(`
      INSERT INTO votes (user_id, content_type, content_id, vote_value)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE vote_value = ?
    `, [userId, content_type, content_id, vote_value, vote_value]);

    // Update vote score in main table (optimization)
    await db.query(`
      UPDATE ${table}
      SET vote_score = (
        SELECT COALESCE(SUM(vote_value), 0)
        FROM votes
        WHERE content_type = ? AND content_id = ?
      )
      WHERE id = ?
    `, [content_type, content_id, content_id]);

    // Get updated vote score
    const [updated] = await db.query(
      `SELECT vote_score FROM ${table} WHERE id = ?`,
      [content_id]
    );

    res.json({ 
      success: true,
      newScore: updated[0].vote_score,
      userVote: vote_value
    });

  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Failed to process vote' });
  }
});

// Get user's vote status (optional)
app.get('/api/votes/status', authenticateToken, async (req, res) => {
  try {
    const { content_type, content_id } = req.query;
    const userId = req.user.id;

    const [vote] = await db.query(
      `SELECT vote_value FROM votes 
       WHERE user_id = ? AND content_type = ? AND content_id = ?`,
      [userId, content_type, content_id]
    );

    res.json({ userVote: vote[0]?.vote_value || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get vote status' });
  }
});


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

// Delete a reply (admin only)
app.delete('/api/channels/:channelId/posts/:postId/replies/:replyId', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const { replyId } = req.params;

    // Delete reply and its votes (cascading)
    const [result] = await db.query(`
      DELETE FROM replies WHERE id = ?
    `, [replyId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'reply not found' });
    }
    res.sendStatus(204);
  } catch (err) {
    console.error('Failed to delete reply:', err);
    res.status(500).json({ error: 'Failed to delete reply' });
  }
});



app.post('/api/upload', 
  authenticateToken,
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ 
      success: true,
      path: `/uploads/${req.file.filename}` 
    });
  }
);


// Initialize and start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
  });
});