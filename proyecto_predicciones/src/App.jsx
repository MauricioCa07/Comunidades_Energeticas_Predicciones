import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeDashboard from './components/HomeDashboard';
import EnergyDashboard from './components/EnergyDashboard';
import WeatherDashboard from './components/WeatherDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeDashboard />} />
        <Route path="/com" element={<EnergyDashboard />} />
        <Route path="/weather" element={<WeatherDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
