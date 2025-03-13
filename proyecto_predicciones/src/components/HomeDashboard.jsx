import React from 'react';
import { Link } from 'react-router-dom';
import './HomeDashboard.css';

function Home() {
  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">Apartado de Predicciones</h1>
        <p className="home-subtitle">Seleccione el tipo de predicción que desea visualizar</p>
        
        <div className="button-container">
          <Link to="/weather" className="prediction-button">
            <div className="button-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 18a5 5 0 0 0-10 0"></path>
                <line x1="12" y1="9" x2="12" y2="2"></line>
                <line x1="4.22" y1="10.22" x2="5.64" y2="11.64"></line>
                <line x1="1" y1="18" x2="3" y2="18"></line>
                <line x1="21" y1="18" x2="23" y2="18"></line>
                <line x1="18.36" y1="11.64" x2="19.78" y2="10.22"></line>
                <line x1="23" y1="22" x2="1" y2="22"></line>
                <polyline points="8 6 12 2 16 6"></polyline>
              </svg>
            </div>
            <div className="button-text">
              <h3>Clima</h3>
              <p>Predicciones meteorológicas</p>
            </div>
          </Link>

          <Link to="/com" className="prediction-button">
            <div className="button-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 3v4c0 2-2 4-4 4H2"></path>
                <path d="M6 11v4c0 2 2 4 4 4h12"></path>
                <path d="M15 7l-3 3 3 3"></path>
                <path d="M9 17l3-3-3-3"></path>
              </svg>
            </div>
            <div className="button-text">
              <h3>Energía</h3>
              <p>Consumo y predicciones energéticas</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Home;