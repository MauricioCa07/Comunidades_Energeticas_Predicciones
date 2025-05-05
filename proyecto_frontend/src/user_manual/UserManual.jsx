import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom';
import './UserManual.css';

function UserManual() {
    const location = useLocation()

    return (
        <div className="manual-container">
            <header className="manual-header">
                <h1> Manual de Usuario </h1>
                <p>
                    Guía para entender y utilizar la aplicación de predicciones Energéticas
                </p>
                
            <Link to="/" className="home-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
            </Link>
            </header>
            
            <div class="manual-content">
            {(location.pathname === '/manual' || location.pathname === '/manual/') && (
            <>
                <section id="introduccion">
                    <h2>1. Introducción</h2>
                    <p>
                        Bienvenido/a a la aplicación de predicciones energéticas...
                    </p>
                </section>

                <nav className="manual-navigation">
                    <h2>Índice del Manual</h2>
                    <ul>
                        <li><Link to="generacion">Guía del Módulo de Generación Solar</Link></li>
                        <li><Link to="consumo">Guía del Módulo de Consumo Energético</Link></li>
                    </ul>
                </nav>
            </>
            )}
            <Outlet />
        </div>
    </div>
  );
}

export default UserManual;