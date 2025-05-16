import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomeDashboard from './dashboards/HomeDashboard';
import EnergyDashboard from './dashboards/EnergyDashboard';
import WeatherDashboard from './dashboards/WeatherDashboard';
import UserManual from './user_manual/UserManual';
import GenerationManual from './user_manual/GenerationManual';
import ConsumptionManual from './user_manual/ConsumptionManual';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomeDashboard />} />
        <Route path="/consumption" element={<EnergyDashboard />} />
        <Route path="/results" element={<WeatherDashboard />} />
        <Route path="/manual" element={<UserManual />}>
          <Route path="generacion" element={<GenerationManual />} />
          <Route path="consumo" element={<ConsumptionManual />} />
        </Route>
        
      </Routes>
    </Router>
  );
}

export default App;
