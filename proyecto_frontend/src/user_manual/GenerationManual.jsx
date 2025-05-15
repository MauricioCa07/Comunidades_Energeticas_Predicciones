import React from 'react';
import InfoToolTip from '../utilities/InfoTooltip.jsx';
import './UserManual.css';

function GenerationManual(){
    return(
        <div className="manual-section">
            <h2>Predicción Meteorológica y Generación Solar</h2>
            <p>
                Este módulo se conecta directamente con el microservicio Weather-1.0, especializado en la predicción de variables meteorológicas y la estimación de energía solar generada por un sistema fotovoltaico bajo esas condiciones. Este módulo consta de dos pestañas principales:
            </p>

            <h2>Predicciones Meteorológicas</h2>
            <p>
                En esta pestaña encontrarás gráficos y tablas detalladas que muestran predicciones meteorológicas para las próximas 24 horas en intervalos de 5 minutos. Las variables que podrás consultar incluyen:
            </p>
            <ul>
                <li>Temperatura (°C)</li>
                <li>Radiación Solar (W/m²)</li>
                <li>Humedad (%)</li>
                <li>Precipitación (mm/h)</li>
                <li>Velocidad y dirección del viento (m/s, °)</li>
            </ul>
            <p>
                Estos datos te permitirán anticiparte a las condiciones climáticas y planificar adecuadamente.
            </p>

            <h2>Generación Solar</h2>
            <p>
                En esta pestaña encontrarás una estimación precisa de la generación energética solar potencial, considerando las condiciones meteorológicas previstas y los parámetros específicos del sistema fotovoltaico. Esta sección incluye:
            </p>
            <ul>
                <li>Energía Total Estimada (kWh)</li>
                <li>Potencia Pico (kW)</li>
                <li>Factor de Capacidad (%)</li>
            </ul>
            <p>
                Además, gráficos detallados mostrarán la radiación solar esperada y la potencia generada en función de variables como la temperatura del aire y la velocidad del viento.
            </p>
        </div>
    );
}

export default GenerationManual;