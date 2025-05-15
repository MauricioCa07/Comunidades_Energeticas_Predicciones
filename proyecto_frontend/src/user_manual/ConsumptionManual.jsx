import React from 'react';
import './UserManual.css';


function ConsumptionManual() {
  return (
    <div className="manual-section">
      <h2>Dashboard de Consumo Energético</h2>
      <p>
        El módulo de predicción de consumo energético se conecta directamente con el microservicio COM-3.0, que es nuestro modelo avanzado encargado de predecir el consumo eléctrico basado en tu comportamiento del último día. Este modelo te permite evaluar si deseas vender energía y determinar la cantidad de energía que podrías comercializar.
      </p>
      <p>
        Este módulo se divide en tres apartados principales:
      </p>

      <h2>Vista General</h2>
      <p>
        En este apartado encontrarás un gráfico claro y sencillo que presenta tu consumo energético pronosticado para el día actual según el modelo COM-3.0. Además, visualizarás algunos valores clave de referencia, como el consumo promedio del día anterior comparado con el consumo estimado para hoy.
      </p>

      <h2>Detalles</h2>
      <p>
        Aquí podrás observar una gráfica detallada que compara el comportamiento energético pronosticado con el comportamiento real del día anterior. También incluye un desglose por horas de la predicción realizada, permitiendo una comprensión más profunda y precisa.
      </p>

      <h2>Análisis</h2>
      <p>
        Este apartado ofrece herramientas para analizar tu consumo energético en bloques horarios específicos. Al final, encontrarás una tabla que resume y analiza las variables globales más relevantes, facilitando así la toma de decisiones informadas y estratégicas.
      </p>
    </div>
  );
}

export default ConsumptionManual;