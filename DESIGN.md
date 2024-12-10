## Overview

This design document provides a technical explanation of the architectural and implementation details of the ButteryBook.

The project consists of two main components:

1. **Frontend (React SPA)**: A single-page application built with React and styled using TailwindCSS and DaisyUI. The frontend consumes a RESTful API, displays buttery information, and provides an administrative interface for updating hours.
I chose React to design my framework because it is closer to what is used in industry: JavaScript is the most popular language for designing websites, and React provides a robust framework to create frontends. 

3. **Backend (Node.js, Express, SQLite)**: A REST API that exposes endpoints for retrieving buttery data and updating their status. The server authenticates administrators, interacts with a SQLite database, and handles the logic for open/closed states.
I chose this setup because Node.js is more commonly used to design backends for react websites: Flask requires me to update the website every time hours are changed to reflect changes. This creates edge-cases where users may receive obsolete hours, leading to college-student-sadness :(

## Architectural Rationale

**Single-Page Application (SPA)**:  
The frontend is implemented as a React SPA. I put the frontend and backend in two separate folders to separate concerns, and to allow the backend and frontend to be deployed separately. Additionally, since the data being displayed is relatively small, only one page is needed for maximum convenience.

**SQLite as the Data Store**:  
SQLite is a file-based SQL database that is easy to set up and maintain. For a project of this scale (a relatively small dataset of buttery locations and schedules), SQLite provides the right balance of simplicity and capability. 
Most importantly, it removes the overhead of managing a separate database server and keeps the deployment straightforward. A framework like Django or MongoDB has a learning curve too cumbersome to provide benefit for a project this size.

## Data Model and Entities

**Butteries Table**:
- **Fields**: `id`, `name`, `info`, `hours_start`, `hours_end`, `hours_days`, `closedToday`, `closedReason`.
- **Justification**: 
  - `hours_start` and `hours_end` are stored as fractional hours (floats) rather than strings or separate hour/minute fields. This allows for simple numeric comparisons to determine if the current time falls within the operating window. Converting to and from human-readable times occurs at the application level.
  - `hours_days` is stored as a comma-separated string of integers that map to days of the week (0=Sunday, ...). Although this is slightly denormalized, it’s convenient for quick parsing, and given the small dataset, performance is not an issue. If scalability demanded, I might consider a separate `buttery_days` table or a more expressive schema.
  - `closedToday` and `closedReason` allow for ad-hoc closures without altering the underlying schedule. Butteries close often, so I figured this would be convenient for Buttery managers to quickly alter hours.

**Initialization Logic**:  
On server startup, if no butteries are found, a set of default entries is seeded into the database. This ensures the app is immediately functional and demonstrates the intended data structure.

**Authentication Details**
- By default, a single admin user is hardcoded: username: admin, password: password.
- After logging in, a token is stored in the browser's localStorage.
- Subsequent edits to the buttery hours require this token.
  
**Database Schema**
- butteries table:
  - id: INTEGER PRIMARY KEY AUTOINCREMENT
  - name: TEXT
  - info: TEXT
  - hours_start: REAL
  - hours_end: REAL
  - hours_days: TEXT (comma-separated list of days)
  - closedToday: INTEGER (0 or 1)
  - closedReason: TEXT (optional)

## Frontend Design

**React Components**:  
The frontend uses stateful React hooks (e.g., `useState`, `useEffect`) extensively:
- `locations` is the main state holding all buttery information fetched from the backend.
- `openLocations` and `closedLocations` are derived data, computed on intervals and initial load.
- `selectedCollege` and `isOpen` manage UI state for dropdowns and detail views.
- Authentication-related state (`isLoggedIn`, `token`) is managed via `localStorage` and React state hooks.

This design allows the UI to re-render automatically when new data arrives or when the user updates any state, such as logging in or editing hours.

**Time Conversion and Schedules**:
- The frontend converts fractional hours to `HH:MM` formats for display and vice versa when sending updates to the server.
- To determine if a buttery is open, the frontend:
  1. Checks if `closedToday` is set.
  2. Verifies the current day is in the buttery’s `hours_days`.
  3. Compares the current fractional hour with `hours_start` and `hours_end`.
  
This logic is encapsulated in helper functions that keep the UI code clean and focus on presentation rather than logic.

**UI/UX Decisions**:
- A dropdown menu allows users to select a buttery for detailed information.
- Separate sections for "Open Butteries" and "Closed Butteries" give users a quick overview, showing students immediately where they should go.
- The administrative interface is conditionally shown after a user logs in, as most users only need to view the schedule.

## Backend and Server Design

**Express.js and Routing**:
- All buttery-related endpoints are scoped under `/api/butteries`.
- The `GET /api/butteries` endpoint returns all butteries with their computed `info`.
- The `PUT /api/butteries/:id` endpoint updates hours and closed status, protected by JWT authentication.
- A separate `/login` endpoint handles user authentication.

**Authentication**:
- A hardcoded admin user (for demonstration) is verified against a bcrypt-hashed password.
- Upon successful login, a JWT is returned, which must be included as a Bearer token for editing hours.
- The choice of JWT simplifies stateless authentication. Since the project has a single user scenario, more complex user management was not required. If deployed on a higher scale (with multiple accounts), I may consider a different framework instead of hard-coding users.

**Error Handling and Validation**:
- Backend endpoints check for missing fields and handle database errors.
- Validation is minimal in this prototype. For a production scenario, adding request validation (e.g., via `express-validator`) and more robust error responses would be advisable.
