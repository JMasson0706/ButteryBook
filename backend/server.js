const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = express();
// Middleware
app.use(cors());
app.use(express.json());
// Connect to SQLite database
const db = new sqlite3.Database('butteries.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});
// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS butteries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      info TEXT,
      hours_start REAL,
      hours_end REAL,
      hours_days TEXT
    )
  `);
  // For user authentication, you could create a users table here.
  // For demonstration, we will hardcode a user.
  
  // Check if table is empty and initialize with data if needed
  db.get("SELECT COUNT(*) as count FROM butteries", [], (err, row) => {
    if (err) {
      console.error(err);
      return;
    }
    // Initial data values I pulled from current times -- this is just to populate the base database
    if (row.count === 0) {
      const initialData = [
        ['Benjamin Franklin', "Ben's Butt\nOpen 10PM-1AM | Sun-Thurs", 22, 1, '0,1,2,3,4'],
        ['Berkeley', "Marvin's\nOpen 10PM-1AM | Sun-Fri", 22, 1, '0,1,2,3,4,5'],
        ['Branford', "The Nuttery\nOpen 10:30PM-12:45AM | Sun-Fri", 22.5, 0.75, '0,1,2,3,4,5'],
        ['Davenport', "The Dive\nOpen 10:30PM-12:45AM | Sun-Fri", 22.5, 0.75, '0,1,2,3,4,5'],
        ['Ezra Stiles', "Moose Butt\nOpen 10PM-12:50AM | Sun-Thurs", 22, 0.833, '0,1,2,3,4'],
        ['Grace Hopper', "The Trolley Stop\nOpen 10PM-1AM | Sun-Thurs", 22, 1, '0,1,2,3,4'],
        ['Jonathan Edwards', "JE Buttery\nOpen 9:30PM-12:30AM | Sun-Thurs", 21.5, 0.5, '0,1,2,3,4'],
        ['Morse', "The Morsel\nOpen 10PM-12AM | Sun-Thurs", 22, 0, '0,1,2,3,4'],
        ['Pauli Murray', "MY Butt\nOpen 10PM-1AM | Sun-Thurs", 22, 1, '0,1,2,3,4'],
        ['Pierson', "Pierson Knight Club\nOpen 10:30PM-12:30AM | Sun-Thurs", 22.5, 0.5, '0,1,2,3,4'],
        ['Saybrook', "The Squiche\nOpen 9PM-12AM | Sun-Thurs", 21, 0, '0,1,2,3,4'],
        ['Silliman', "Sillibutt\nOpen 10PM-1AM | Sun-Thurs", 22, 1, '0,1,2,3,4'],
        ['Timothy Dwight', "TD Butt\nOpen 10PM-1AM | Sun-Thurs", 22, 1, '0,1,2,3,4'],
        ['Trumbull', "The TrumButt\nOpen 10PM-1:30AM Sun-Thurs", 22, 1.5, '0,1,2,3,4']
      ];
      const stmt = db.prepare(`
        INSERT INTO butteries (name, info, hours_start, hours_end, hours_days)
        VALUES (?, ?, ?, ?, ?)
      `);
      initialData.forEach(row => {
        stmt.run(row, (err) => {
          if (err) console.error('Error inserting initial data:', err);
        });
      });
      stmt.finalize();
    }
  });
});
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function floatToTimeString(value) {
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  return `${hStr}:${mStr}`;
}
function generateInfoFromHours(hours_start, hours_end, hours_days) {
  const startTimeStr = floatToTimeString(hours_start);
  const endTimeStr = floatToTimeString(hours_end);
  const daysStr = hours_days.split(',').map(d => dayNames[Number(d)]).join(", ");
  return `Open ${startTimeStr} - ${endTimeStr} | ${daysStr}`;
}
// Hardcoded user for demonstration: new admins can create an account
const HARD_CODED_USER = {
  username: 'admin',
  password: bcrypt.hashSync('password', 10) // Put a real hash here
};
// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1]; 
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
// Login Route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Check against hardcoded user for demonstration
  if (username !== HARD_CODED_USER.username) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  bcrypt.compare(password, HARD_CODED_USER.password, (err, isMatch) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  });
});
// Routes
app.get('/api/butteries', (req, res) => {
  db.all(`SELECT * FROM butteries`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    const butteries = rows.map(row => {
      const info = generateInfoFromHours(row.hours_start, row.hours_end, row.hours_days);
      return {
        id: row.id,
        name: row.name,
        info: info,
        hours: {
          start: row.hours_start,
          end: row.hours_end,
          days: row.hours_days.split(',').map(Number),
          closedToday: !!row.closedToday, // Convert integer to boolean
          closedReason: row.closedReason || ''
        }
      };
    });
    res.json(butteries);
  });
});
// PUT route (Protected)
app.put('/api/butteries/:id', authenticateToken, (req, res) => {
  const { hours } = req.body;
  const { id } = req.params;
  // Convert boolean closedToday to an integer for storage
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
        res.json(buttery);
      });
    }
  );
});
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// Handle cleanup on server shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Closed the database connection.');
    process.exit(0);
  });
});
