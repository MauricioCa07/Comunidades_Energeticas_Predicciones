import React from 'react';
import InfoToolTip from '../components/InfoTooltip';
import './UserManual.css';

function GenerationManual(){
    return(
        <div className="manual-section">
            <h2>Dashboard meterológico y solar</h2>
            <p>
                Esta sección muestra las predicciones de diversas variables meteorológicas y la estimación
                de cuánta energía podría generar un sistema solar fotovoltaico bajo esas condiciones.
            </p>
            <h3>Pestaña "Predicciones Meterológicas</h3>
            <p>
                Aquí encontrarás gráficos y una tabla detallada con las predicciones para las próximas 24 horas
                (en intervalos de 5 minutos) de variables como:
                <ul>
                    <li>Temperatura (°C)</li>
                    <li>Radiación Solar (W/m²)</li>
                    <li>Humedad (%)</li>
                    <li>Precipitación (mm/h)</li>
                    <li>Viento (m/s, °)</li>
                </ul>
            </p>
        </div>
    )

}
export default GenerationManual;