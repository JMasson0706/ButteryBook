# ButteryBook
A way for people to find open Butteries at Yale

# CS50 Final Project: ButteryBook 

This application displays the current open/closed status of various "butteries." A **buttery** is a late-night student-run snack bar within a residential college (For those at Harvard who don't know). The application allows users to view which butteries are currently open, along with their operating hours. Administrators (whose account I have hard-coded in for now) can log in to update the hours and open/closed status of each buttery. 

## Overview

- **Frontend**: Built with [React](https://reactjs.org/).  
- **Backend**: Built with Node.js, Express, and SQLite (SQL-based database).
- **Authentication**: Simple JWT-based authentication for administrators.

## Features

1. **Viewing Butteries**:  
   - Users can see a dropdown list of residential colleges.
   - Selecting a college shows its detailed info (operating hours and description).
   - Displays a list of butteries currently open and those closed (including reasons if provided).

2. **Real-Time Updates**:  
   - The frontend periodically checks and updates which butteries are open (once per minute).
   
3. **Administrator Editing**:  
   - Admin can log in to update hours, days open, and closed status.
   - Changes immediately reflect on the frontend.

4. **Responsive Design**:  
   - The React UI is styled and uses Tailwind CSS/DaisyUI classes for a more aesthetically pleasing frontend.
   
## Technology Stack

### Frontend
- **React**: JavaScript library for building user interfaces.
- **DaisyUI/Tailwind CSS**: For styling, responsive design, and easily customizable UI components.
- **Axios**: For sending AJAX requests to the backend.

### Backend
- **Node.js & Express**: For handling HTTP requests and serving API endpoints.
- **SQLite**: A lightweight, file-based SQL database.
- **JWT (JSON Web Token)**: For secure authentication.
- **bcrypt**: For hashing and checking passwords.

## How It Works

1. **Data Flow**:
   - On startup, the backend initializes a SQLite database `butteries.db` with some preset buttery data if it's empty.
   - The React frontend queries the backend's `/api/butteries` endpoint to get a list of butteries and their info.

2. **Open/Closed Logic**:
   - Each buttery record includes:
     - `hours_start` and `hours_end` in fractional hours (e.g., 22.5 for 10:30 PM).
     - `hours_days` listing which days of the week the buttery operates (0=Sunday, 1=Monday, etc.).
   - The frontend determines which butteries are open by comparing the current time and day to the stored schedule.
   - If a buttery is marked `closedToday`, it will appear in the closed list regardless of schedule.

3. **Editing Hours**:
   - Admins can log in using the hardcoded credentials (`admin/password`).
   - Upon logging in, a JWT token is stored in `localStorage`.
   - When editing hours, the frontend sends an authorized `PUT` request with updated times/days.
   - The backend updates the SQLite database and responds with the updated buttery info.

## Setup Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v14+)
- [npm](https://www.npmjs.com/)
- [bcrypt] (Can install through npm)
- [axios] (can Install through npm)

  
### Steps
1. **Clone this repository**:
   ```bash
   git clone https://github.com/JMasson0706/ButteryBook.git
   cd ButteryBook
2. **Install Backend Dependencies:**
    bash
    Copy code
    cd backend
    npm install
3. **Install Frontend Dependencies:**
    bash
    Copy code
    cd ../frontend
    npm install
4. **Run the Backend:**
    bash
    Copy code
    cd ../backend
    npm start
This will start the server on http://localhost:8000.

5. **Run the Frontend:**

    bash
    Copy code
    cd ../frontend
    npm start
This will start the React development server on http://localhost:3000.
