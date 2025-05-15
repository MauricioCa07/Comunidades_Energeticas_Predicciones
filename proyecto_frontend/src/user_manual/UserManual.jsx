import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom';
import './UserManual.css';

function UserManual() {
    const location = useLocation()

    return (
        <div className="manual-container">
            <Link to="/" className="home-button">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
            </Link>
            <header className="manual-header">
                <h1> Manual de Usuario </h1>
                <p>
                Este proyecto ha sido desarrollado para el programa GRID de la Universidad EAFIT, 
                enfocado en la optimización del uso de predicciones de consumo y producción de energía
                eléctrica dentro de comunidades energéticas. Nuestra página web utiliza técnicas avanzadas de 
                machine learning para ofrecer predicciones precisas y relevantes, potenciando así la gestión eficiente 
                del consumo energético.

                Nos comprometemos a proporcionar una experiencia personalizada para cada usuario, facilitando la 
                comprensión del comportamiento energético en su comunidad y permitiéndoles tomar decisiones informadas 
                y estratégicas. Nuestro objetivo es mejorar la usabilidad y la accesibilidad de los datos energéticos, 
                apoyando a las comunidades en la transición hacia un consumo energético más inteligente y sostenible.
                </p>
            </header>
            
            <div class="manual-content">
            {(location.pathname === '/manual' || location.pathname === '/manual/') && (
            <>
                <nav className="manual-navigation">
                    <h2>Explora nuestros modelos </h2>
                    <ul>
                        <li><Link to="generacion">Guía del Módulo de Producción Energetica</Link></li>
                        <li><Link to="consumo">Guía del Módulo de Consumo Energetica</Link></li>
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