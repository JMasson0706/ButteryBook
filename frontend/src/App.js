import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

function App() {
  const [locations, setLocations] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [openLocations, setOpenLocations] = useState([]);
  const [closedLocations, setClosedLocations] = useState([]);
  const [editCollegeIndex, setEditCollegeIndex] = useState(null);
  const [formData, setFormData] = useState({ start: '', end: '', days: '', closedToday: false, closedReason: '' });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [loginError, setLoginError] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    axios.get('http://localhost:8000/api/butteries')
      .then(response => {
        setLocations(response.data);
      })
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  const timeToFloat = timeStr => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
  };

  const handleFormChange = e => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const updateHours = async () => {
    if (editCollegeIndex !== null) {
      const butteryId = locations[editCollegeIndex].id;
      const daysArray = formData.days
        .split(',')
        .map(d => parseInt(d.trim(), 10))
        .filter(d => !isNaN(d));

      try {
        const token = localStorage.getItem('token');
        const response = await axios.put(`http://localhost:8000/api/butteries/${butteryId}`, {
          hours: {
            start: timeToFloat(formData.start),
            end: timeToFloat(formData.end),
            days: daysArray,
            closedToday: formData.closedToday,
            closedReason: formData.closedReason
          }
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const updatedLocations = [...locations];
        updatedLocations[editCollegeIndex] = response.data;
        setLocations(updatedLocations);

        setEditCollegeIndex(null);
        setFormData({ start: '', end: '', days: '', closedToday: false, closedReason: '' });
      } catch (error) {
        console.error('Error updating hours:', error);
      }
    }
  };

  const getOpenLocations = () => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    const currentDay = now.getDay();
  
    return locations.filter(({ hours }) => {
      const { start, end, days, closedToday } = hours;
      if (closedToday) return false;
      const isToday = days.includes(currentDay);
  
      return start < end
        ? isToday && currentHour >= start && currentHour < end
        : isToday && (currentHour >= start || currentHour < end);
    });
  };
  
  const getClosedLocations = () => {
    return locations.filter(({ hours }) => hours.closedToday);
  };
  

  useEffect(() => {
    const interval = setInterval(() => {
      setOpenLocations(getOpenLocations());
      setClosedLocations(getClosedLocations());
    }, 60000);

    // Initial load
    setOpenLocations(getOpenLocations());
    setClosedLocations(getClosedLocations());

    return () => clearInterval(interval);
  }, [locations]);

  const isCollegeOpen = (index) => {
    if (index === null) return false;
    const college = locations[index];
    return openLocations.some(loc => loc.id === college.id);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/login', { username, password });
      const { token } = response.data;
      localStorage.setItem('token', token);
      setIsLoggedIn(true);
      setLoginError('');
      setShowLogin(false);
    } catch (error) {
      setLoginError('Invalid login credentials.');
      console.error('Error logging in:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  return (
    <div data-theme="cupcake" className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <nav className="navbar bg-base-200 px-4 shadow-sm flex justify-between items-center">
        <a className="btn btn-ghost normal-case text-xl text-indigo-800">CS50 Final Project</a>
        <div>
          {!isLoggedIn && (
            <button className="btn btn-primary mr-2" onClick={() => setShowLogin(!showLogin)}>
              Login
            </button>
          )}
          {isLoggedIn && (
            <button className="btn btn-secondary" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-4">
        {showLogin && !isLoggedIn && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="p-4 bg-white shadow-md rounded-xl w-96">
              <h2 className="text-2xl font-bold mb-4">Login to Edit Hours</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-lg">Username</label>
                  <input 
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)} 
                    className="input input-bordered w-full" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-lg">Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="input input-bordered w-full" 
                    required
                  />
                </div>
                {loginError && <p className="text-red-500">{loginError}</p>}
                <div className="flex justify-end space-x-2">
                  <button 
                    type="button" 
                    className="btn btn-ghost" 
                    onClick={() => setShowLogin(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">Login</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <h1 className="text-4xl font-extrabold text-center text-indigo-800 my-8 flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-800" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 11l18-9M4 10v12h16V10M12 10v12" />
          </svg>
          What's Open?
        </h1>

        <div className="relative w-72 mx-auto">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full btn btn-primary"
          >
            Select a College
          </button>

          {isOpen && (
            <div className="absolute left-0 w-full mt-2 bg-white rounded-xl shadow-lg max-h-60 overflow-y-auto z-10">
              {locations.map((location, index) => (
                <div
                  key={location.id}
                  onClick={() => {
                    setSelectedCollege(index);
                    setIsOpen(false);
                  }}
                  className="cursor-pointer text-lg text-indigo-800 hover:bg-indigo-100 px-4 py-3"
                >
                  {location.name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Butteries Section */}
        <div className="mt-8 p-4 bg-indigo-50 rounded-xl shadow-md">
          <h2 className="text-2xl font-semibold text-indigo-700">Open Butteries</h2>
          {openLocations.length > 0 ? (
            <ul className="mt-4 text-lg text-gray-800 list-disc list-inside">
              {openLocations.map(location => (
                <li key={location.id}>
                  <span className="inline-flex items-center gap-2">
                    {location.name}
                    <span className="badge badge-success">Open</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-lg text-gray-600">No Butteries Open Right Now</p>
          )}
        </div>

        {/* Closed Butteries Section */}
        <div className="mt-8 p-4 bg-red-50 rounded-xl shadow-md">
          <h2 className="text-2xl font-semibold text-red-700">Closed Butteries</h2>
          {closedLocations.length > 0 ? (
            <ul className="mt-4 text-lg text-gray-800 list-disc list-inside">
              {closedLocations.map(location => (
                <li key={location.id} className="flex items-center gap-2">
                  {location.name}
                  <span className="badge badge-error">Closed</span>
                  {location.hours.closedReason && (
                    <span className="text-sm text-gray-600 italic">
                      Reason: {location.hours.closedReason}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-lg text-gray-600">No Butteries Closed Today</p>
          )}
        </div>

        {selectedCollege !== null && (
          <div className="mt-8 card shadow-lg bg-white">
            <div className="card-body">
              <h2 className="card-title text-3xl font-bold text-indigo-800 flex items-center gap-2">
                {locations[selectedCollege].name}
                {isCollegeOpen(selectedCollege) ? (
                  <span className="badge badge-success">Open</span>
                ) : (
                  locations[selectedCollege].hours.closedToday ? (
                    <span className="badge badge-error">Closed</span>
                  ) : (
                    <span className="badge badge-secondary">Closed</span>
                  )
                )}
              </h2>
              <p className="mt-4 text-lg text-gray-600 whitespace-pre-line">
                {locations[selectedCollege].info}
              </p>
              {isLoggedIn && (
                <div className="card-actions mt-4">
                  <button
                    onClick={() => {
                      setEditCollegeIndex(selectedCollege);
                      const current = locations[selectedCollege].hours;
                      setFormData({
                        start: current.start ? `${Math.floor(current.start)}:${(current.start % 1)*60 || '00'}` : '',
                        end: current.end ? `${Math.floor(current.end)}:${(current.end % 1)*60 || '00'}` : '',
                        days: current.days ? current.days.join(',') : '',
                        closedToday: current.closedToday || false,
                        closedReason: current.closedReason || ''
                      });
                    }}
                    className="btn btn-primary"
                  >
                    Edit Hours
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {editCollegeIndex !== null && isLoggedIn && (
          <div className="mt-8 card shadow-md bg-gray-100">
            <div className="card-body">
              <h3 className="text-2xl font-bold text-indigo-800">Edit Hours</h3>
              <label className="block mt-4 text-lg">
                Start Time (HH:MM):
                <input
                  type="time"
                  name="start"
                  value={formData.start}
                  onChange={handleFormChange}
                  className="block w-full mt-2 p-2 border border-gray-300 rounded"
                />
              </label>
              <label className="block mt-4 text-lg">
                End Time (HH:MM):
                <input
                  type="time"
                  name="end"
                  value={formData.end}
                  onChange={handleFormChange}
                  className="block w-full mt-2 p-2 border border-gray-300 rounded"
                />
              </label>
              <label className="block mt-4 text-lg">
                Days Open (comma-separated, 0=Sun, 1=Mon, ...):
                <input
                  type="text"
                  name="days"
                  value={formData.days}
                  onChange={handleFormChange}
                  className="block w-full mt-2 p-2 border border-gray-300 rounded"
                />
              </label>
              <label className="block mt-4 text-lg">
                <input
                  type="checkbox"
                  name="closedToday"
                  checked={formData.closedToday}
                  onChange={handleFormChange}
                  className="mr-2"
                />
                Closed today?
              </label>
              {formData.closedToday && (
                <label className="block mt-4 text-lg">
                  Reason for closing:
                  <input
                    type="text"
                    name="closedReason"
                    value={formData.closedReason}
                    onChange={handleFormChange}
                    className="block w-full mt-2 p-2 border border-gray-300 rounded"
                  />
                </label>
              )}
              <div className="card-actions mt-4">
                <button
                  onClick={updateHours}
                  className="btn btn-primary"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="carousel carousel-end rounded-box my-8 shadow-md">
          <div className="carousel-item">
            <img src="https://img.daisyui.com/images/stock/photo-1559703248-dcaaec9fab78.webp" alt="Drink" />
          </div>
          <div className="carousel-item">
            <img src="https://img.daisyui.com/images/stock/photo-1565098772267-60af42b81ef2.webp" alt="Drink" />
          </div>
          <div className="carousel-item">
            <img src="https://img.daisyui.com/images/stock/photo-1572635148818-ef6fd45eb394.webp" alt="Drink" />
          </div>
          <div className="carousel-item">
            <img src="https://img.daisyui.com/images/stock/photo-1494253109108-2e30c049369b.webp" alt="Drink" />
          </div>
          <div className="carousel-item">
            <img src="https://img.daisyui.com/images/stock/photo-1550258987-190a2d41a8ba.webp" alt="Drink" />
          </div>
          <div className="carousel-item">
            <img src="https://img.daisyui.com/images/stock/photo-1559181567-c3190ca9959b.webp" alt="Drink" />
          </div>
          <div className="carousel-item">
            <img src="https://img.daisyui.com/images/stock/photo-1601004890684-d8cbf643f5f2.webp" alt="Drink" />
          </div>
        </div>
      </div>
      <footer className="bg-gray-100 text-center py-4">
        <p className="text-gray-600 text-sm">
          Made with  
          <span className="text-red-500">&hearts;</span> 
          by James Masson
        </p>
      </footer>
    </div>
  );
}

export default App;
