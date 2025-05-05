import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeDashboard from './components/HomeDashboard';
import EnergyDashboard from './components/EnergyDashboard';
import WeatherDashboard from './components/WeatherDashboard';
import UserManual from './user_manual/UserManual';
import GenerationManual from './user_manual/GenerationManual';
import ConsumptionManual from './user_manual/ConsumptionManual';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeDashboard />} />
        <Route path="/consumption" element={<EnergyDashboard />} />
        <Route path="/weather" element={<WeatherDashboard />} />
        <Route path="/manual" element={<UserManual />}>
          <Route path="generacion" element={<GenerationManual />} />
          <Route path="consumo" element={<ConsumptionManual />} />
        </Route>
        
      </Routes>
    </Router>
  );
}

export default App;
