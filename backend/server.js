// Import necessary libraries
const express = require('express');  // Express.js framework for building the API
const sqlite3 = require('sqlite3').verbose(); // SQLite database library for handling database interactions
const cors = require('cors'); // CORS middleware to allow cross-origin requests
const path = require('path'); // Path utility for managing file paths
const jwt = require('jsonwebtoken'); // JWT library for creating and verifying JSON Web Tokens
const bcrypt = require('bcrypt'); // Bcrypt for hashing passwords

const app = express();

// Middleware setup
app.use(cors()); // Enable CORS to allow cross-origin requests
app.use(express.json()); // Parse incoming requests with JSON payloads

// Connect to SQLite database
const db = new sqlite3.Database('butteries.db', (err) => {
  if (err) {
    console.error('Error opening database:', err); // Log error if database fails to open
  } else {
    console.log('Connected to SQLite database'); // Log success message if connection is established
  }
});

// Create tables if they don't exist
db.serialize(() => {
  // SQL query to create the butteries table
  db.run(`
    CREATE TABLE IF NOT EXISTS butteries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  // Unique ID for each buttery
      name TEXT NOT NULL,  // Name of the buttery
      info TEXT,  // Information about the buttery (e.g., description and opening times)
      hours_start REAL,  // Starting time in float format (e.g., 22.5 for 10:30 PM)
      hours_end REAL,  // Ending time in float format
      hours_days TEXT  // Days of operation stored as a comma-separated string (e.g., '0,1,2' for Sun-Tue)
    )
  `);

  // Check if the butteries table is empty, if so, insert initial data
  db.get("SELECT COUNT(*) as count FROM butteries", [], (err, row) => {
    if (err) {
      console.error(err); // Log error if query fails
      return;
    }
    // If there are no records in the butteries table, insert initial data
    if (row.count === 0) {
      const initialData = [
        ['Benjamin Franklin', "Ben's Butt\nOpen 10PM-1AM | Sun-Thurs", 22, 1, '0,1,2,3,4'],
        ['Berkeley', "Marvin's\nOpen 10PM-1AM | Sun-Fri", 22, 1, '0,1,2,3,4,5'],
        // Add other initial data...
      ];

      const stmt = db.prepare(`
        INSERT INTO butteries (name, info, hours_start, hours_end, hours_days)
        VALUES (?, ?, ?, ?, ?)
      `);

      // Insert each initial data row into the database
      initialData.forEach(row => {
        stmt.run(row, (err) => {
          if (err) console.error('Error inserting initial data:', err); // Log error if insertion fails
        });
      });

      stmt.finalize();  // Finalize the prepared statement after all inserts
    }
  });
});

// JWT secret (should be stored in an environment variable for security)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // Array of day names for easier mapping

// Helper function to convert float to time string (e.g., 22.5 becomes "22:30")
function floatToTimeString(value) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
}

// Helper function to generate the info string for buttery hours
function generateInfoFromHours(hours_start, hours_end, hours_days) {
  const startTimeStr = floatToTimeString(hours_start);
  const endTimeStr = floatToTimeString(hours_end);
  const daysStr = hours_days.split(',').map(d => dayNames[Number(d)]).join(", ");
  return `Open ${startTimeStr} - ${endTimeStr} | ${daysStr}`;
}

// Hardcoded user for demonstration (password is hashed for security)
const HARD_CODED_USER = {
  username: 'admin',
  password: bcrypt.hashSync('password', 10) // Store password securely using bcrypt hashing
};

// Middleware to authenticate JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']; // Get the Authorization header from request
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1]; // Get the token from the "Bearer token" format
  if (!token) return res.status(401).json({ error: 'No token provided' });

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' }); // Return error if token is invalid
    req.user = user; // Attach the decoded user info to the request object
    next(); // Proceed to the next middleware/route handler
  });
}

// Login route to authenticate and generate JWT token
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Check if the username matches the hardcoded user
  if (username !== HARD_CODED_USER.username) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Compare the provided password with the stored hashed password
  bcrypt.compare(password, HARD_CODED_USER.password, (err, isMatch) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // If credentials are valid, generate a JWT token and return it
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  });
});

// API route to get all butteries
app.get('/api/butteries', (req, res) => {
  db.all(`SELECT * FROM butteries`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const butteries = rows.map(row => {
      const info = generateInfoFromHours(row.hours_start, row.hours_end, row.hours_days); // Generate readable info
      return {
        id: row.id,
        name: row.name,
        info: info,
        hours: {
          start: row.hours_start,
          end: row.hours_end,
          days: row.hours_days.split(',').map(Number), // Convert days from string to an array of integers
          closedToday: !!row.closedToday, // Convert integer (0 or 1) to boolean
          closedReason: row.closedReason || '' // Provide empty string if closedReason is null
        }
      };
    });

    res.json(butteries); // Send the formatted data as a JSON response
  });
});

// PUT route to update buttery hours (requires authentication)
app.put('/api/butteries/:id', authenticateToken, (req, res) => {
  const { hours } = req.body;
  const { id } = req.params;

  // Convert closedToday boolean value to integer for storage
  const closedTodayValue = hours.closedToday ? 1 : 0;

  db.run(
    `UPDATE butteries
     SET hours_start = ?, hours_end = ?, hours_days = ?, closedToday = ?, closedReason = ?
     WHERE id = ?`,
    [hours.start, hours.end, hours.days.join(','), closedTodayValue, hours.closedReason, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Retrieve the updated buttery data
      db.get(`SELECT * FROM butteries WHERE id = ?`, [id], (err, row) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        const info = generateInfoFromHours(row.hours_start, row.hours_end, row.hours_days);

        const buttery = {
          id: row.id,
          name: row.name,
          info: info,
          hours: {
            start: row.hours_start,
            end: row.hours_end,
            days: row.hours_days.split(',').map(Number),
            closedToday: !!row.closedToday,
            closedReason: row.closedReason || ''
          }
        };

        res.json(buttery); // Send the updated buttery data as a response
      });
    }
  );
});

// Set the port for the server to listen on (default to 8000 if not specified)
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle database cleanup when server shuts down
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Closed the database connection.');
    process.exit(0); // Exit the process after cleanup
  });
});
