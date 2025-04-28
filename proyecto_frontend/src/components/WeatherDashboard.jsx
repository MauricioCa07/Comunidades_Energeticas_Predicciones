import React, { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ResponsiveContainer
} from 'recharts';
import './WeatherDashboard.css';
import InfoTooltip from './InfoTooltip';
import { Link } from 'react-router-dom';
import { BarChart2, Home, Battery } from 'lucide-react';

function WeatherDashboard() {
  const [fullDayData, setFullDayData] = useState([]);
  const [predictionData, setPredictionData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('prediction');
  const [startInterval, setStartInterval] = useState(1);
  const [endInterval, setEndInterval] = useState(288);
  const [solarSystemParams] = useState({
    capacity: 5,
    efficiency: 0.18,
    area: 30,
    tilt: 15,
    azimuth: 180,
  });

  const targetVars = [
    'air_temp',
    'ghi',
    'precipitable_water',
    'precipitation_rate',
    'relative_humidity',
    'wind_direction_10m',
    'wind_speed_10m'
  ];

  const varLabels = {
    'air_temp': 'Temperatura (°C)',
    'ghi': 'Radiación (W/m²)',
    'precipitable_water': 'Agua Precipitable (mm)',
    'precipitation_rate': 'Precipitación (mm/h)',
    'relative_humidity': 'Humedad (%)',
    'wind_direction_10m': 'Dirección Viento (°)',
    'wind_speed_10m': 'Velocidad Viento (m/s)'
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="loading-container" style={{ textAlign: 'center', padding: '50px' }}>
          <p>Cargando datos...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container" style={{ textAlign: 'center', padding: '30px', color: 'red' }}>
          <p>Error al cargar las predicciones: {error}</p>
          <button onClick={() => window.location.reload()} className="btn-reset">Reintentar</button>
        </div>
      );
    }

    if (activeTab === 'prediction') {
      return (
        <>
          <div className="charts-section">
            <div className="chart-container">
              <h3>
                Temperatura y Viento
                <InfoTooltip text="Muestra la evolución de la temperatura del aire (en °C) y la velocidad del viento (en m/s) a lo largo del período seleccionado." />
              </h3>
              {predictionData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeLabel" fontSize={12} />
                      <YAxis yAxisId="left" label={{ value: '°C', angle: -90, position: 'insideLeft', offset: 10 }} fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'm/s', angle: 90, position: 'insideRight', offset: 10 }} fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="air_temp" stroke="#ff7300" name="Temperatura" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="wind_speed_10m" stroke="#387908" name="Viento" dot={false} />
                    </LineChart>
                 </ResponsiveContainer>
              ) : <p>No hay datos para mostrar.</p>}
            </div>

            <div className="chart-container">
              <h3>
                Humedad y Precipitación
                <InfoTooltip text="Visualiza la humedad relativa (en %) y la tasa de precipitación (en mm/h) pronosticada para el período." />
              </h3>
              {predictionData.length > 0 ? (
                 <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeLabel" fontSize={12} />
                      <YAxis yAxisId="left" domain={[0, 100]} label={{ value: '%', angle: -90, position: 'insideLeft', offset: 10 }} fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" label={{ value: 'mm/h', angle: 90, position: 'insideRight', offset: 10 }} fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="relative_humidity" stroke="#0088FE" name="Humedad" dot={false} />
                      <Line yAxisId="right" type="monotone" dataKey="precipitation_rate" stroke="#00C49F" name="Precipitación" dot={false} />
                    </LineChart>
                 </ResponsiveContainer>
              ) : <p>No hay datos para mostrar.</p>}
            </div>
          </div>

          <div className="info-section">
             <h3>
                Resumen de Predicciones
                <InfoTooltip text="Tabla con los valores numéricos detallados de todas las variables meteorológicas predichas para cada intervalo de 5 minutos." />
             </h3>
            {predictionData.length > 0 ? (
              <div className="prediction-table-container">
                <table className="prediction-table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      {targetVars.map(v => (
                        <th key={v}>{varLabels[v] || v}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {predictionData.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.timeLabel}</td>
                        {targetVars.map(v => (
                          <td key={v}>{item[v]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p>No hay datos tabulares para mostrar.</p>}
          </div>
        </>
      );
    }

    else if (activeTab === 'generation') {
      return (
        <>
          <div className="generation-header">
            <h2>
              Estimación de Generación Solar
              <InfoTooltip text="Calcula y muestra la energía eléctrica que podría generar un sistema solar fotovoltaico bajo las condiciones meteorológicas pronosticadas y los parámetros definidos." />
            </h2>
            <p>Basado en las condiciones meteorológicas y los parámetros del sistema</p>
          </div>

          <div className="generation-stats">
             <div className="stat-card">
              <div className="stat-value">{generationStats.totalEnergy} kWh</div>
              <div className="stat-label">Energía Total Estimada</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{generationStats.peakPower} kW</div>
              <div className="stat-label">Potencia Pico</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{generationStats.averagePower} kW</div>
              <div className="stat-label">Potencia Promedio</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{generationStats.capacityFactor}%</div>
              <div className="stat-label">Factor de Capacidad</div>
            </div>
          </div>

          <div className="charts-section">
            <div className="chart-container full-width">
              <h3>
                Generación Solar y Radiación
                <InfoTooltip text="Gráfico que compara la potencia solar estimada (en kW) con la radiación solar incidente (GHI en W/m²)." />
              </h3>
              {predictionData.length > 0 && predictionData[0]?.hasOwnProperty('solarPower') ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timeLabel" fontSize={12}/>
                    <YAxis yAxisId="left" label={{ value: 'kW', angle: -90, position: 'insideLeft', offset:10 }} fontSize={12}/>
                    <YAxis yAxisId="right" orientation="right" domain={[0, 1100]} label={{ value: 'W/m²', angle: 90, position: 'insideRight', offset:10 }} fontSize={12}/>
                    <Tooltip />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="solarPower" stroke="#f9a825" fill="#ffd54f" name="Potencia Solar (kW)" />
                    <Line yAxisId="right" type="monotone" dataKey="ghi" stroke="#ff7043" name="Radiación Solar (W/m²)" dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              ) : <p>No se calcularon datos de generación.</p>}
            </div>
          </div>

          <div className="charts-section">
            <div className="chart-container">
              <h3>
                Impacto de la Temperatura
                <InfoTooltip text="Compara la potencia solar generada con la temperatura del aire, mostrando cómo las altas temperaturas pueden afectar la eficiencia." />
              </h3>
              {predictionData.length > 0 && predictionData[0]?.hasOwnProperty('solarPower') ? (
                 <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeLabel" fontSize={12}/>
                      <YAxis yAxisId="left" label={{ value: 'kW', angle: -90, position: 'insideLeft', offset:10 }} fontSize={12}/>
                      <YAxis yAxisId="right" orientation="right" label={{ value: '°C', angle: 90, position: 'insideRight', offset:10 }} fontSize={12}/>
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="solarPower" stroke="#f9a825" name="Potencia (kW)" dot={false}/>
                      <Line yAxisId="right" type="monotone" dataKey="air_temp" stroke="#e53935" name="Temperatura (°C)" dot={false}/>
                    </LineChart>
                 </ResponsiveContainer>
              ) : <p>No hay datos para mostrar.</p>}
            </div>

            <div className="chart-container">
              <h3>
                Impacto de la Nubosidad/Humedad
                <InfoTooltip text="Relaciona la potencia solar generada con la humedad relativa, indicando cómo la nubosidad (usualmente asociada a mayor humedad) puede reducir la generación." />
              </h3>
              {predictionData.length > 0 && predictionData[0]?.hasOwnProperty('solarPower') ? (
                 <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeLabel" fontSize={12}/>
                      <YAxis yAxisId="left" label={{ value: 'kW', angle: -90, position: 'insideLeft', offset:10 }} fontSize={12}/>
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: '%', angle: 90, position: 'insideRight', offset:10 }} fontSize={12}/>
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="solarPower" stroke="#f9a825" name="Potencia (kW)" dot={false}/>
                      <Line yAxisId="right" type="monotone" dataKey="relative_humidity" stroke="#42a5f5" name="Humedad (%)" dot={false}/>
                    </LineChart>
                 </ResponsiveContainer>
              ) : <p>No hay datos para mostrar.</p>}
            </div>
          </div>

          <div className="info-section">
            <h3>
              Detalles de Generación
              <InfoTooltip text="Tabla con los valores detallados de la potencia solar estimada, el factor de capacidad y las variables meteorológicas clave que influyen en ella." />
            </h3>
            {predictionData.length > 0 && predictionData[0]?.hasOwnProperty('solarPower') ? (
              <div className="prediction-table-container">
                <table className="prediction-table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Potencia (kW)</th>
                      <th>% Capacidad</th>
                      <th>Radiación (W/m²)</th>
                      <th>Temp (°C)</th>
                      <th>Humedad (%)</th>
                      <th>Precip (mm/h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictionData.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.timeLabel}</td>
                        <td>{item.solarPower ?? 'N/A'}</td>
                        <td>{item.powerFactor ?? 'N/A'}%</td>
                        <td>{item.ghi}</td>
                        <td>{item.air_temp}</td>
                        <td>{item.relative_humidity}</td>
                        <td>{item.precipitation_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p>No hay datos tabulares de generación para mostrar.</p>}
          </div>
        </>
      );
    }
  };

  function calculateSolarGeneration(weatherData) {
    if (!weatherData || weatherData.length === 0) return [];

    return weatherData.map(data => {
      const tempFactor = data.air_temp > 25 ? 1 - 0.005 *
        (data.air_temp - 25) : 1;
      const [hour, minute] = data.timeLabel.split(':').map(n =>
        parseInt(n));
      const decimalHour = hour + minute / 60;
      const solarAngleFactor = calculateSolarAngleFactor(decimalHour,
        solarSystemParams.tilt);
      const cloudFactor = data.ghi > 0 ? (data.ghi / 1000) : 0;
      const rainFactor = data.precipitation_rate > 0 ? 0.8 : 1;

      let power = solarSystemParams.capacity *
                  solarSystemParams.efficiency / 0.18 *
                  cloudFactor *
                  tempFactor *
                  solarAngleFactor *
                  rainFactor;

      power = Math.max(0, power);
      power = Math.min(power, solarSystemParams.capacity);
      power = parseFloat(power.toFixed(2));

      return {
        ...data,
        solarPower: power,
        powerFactor: parseFloat(
          (power / solarSystemParams.capacity * 100).toFixed(1))
      };
    });
  }

  function calculateSolarAngleFactor(hour, tilt) {
    const angleAtNoon = 90 - tilt;
    const hoursFromNoon = Math.abs(hour - 12);

    if (hoursFromNoon >= 6) return 0.1;
    if (hoursFromNoon >= 4) return angleAtNoon / 90 * 0.4;
    if (hoursFromNoon >= 2) return angleAtNoon / 90 * 0.7;
    return angleAtNoon / 90 * 1;
  }

  const processWeatherPredictionData = (rawData) => {
    if (!rawData || typeof rawData.predictions !== 'object' || rawData.predictions === null) {
      console.error('Formato de respuesta inesperado: falta el objeto "predictions".', rawData);
      throw new Error('Formato de respuesta inesperado del backend.');
    }

    const predictionsObject = rawData.predictions;

    const processed = Object.keys(predictionsObject)
      .sort()
      .map(timestamp => {
        const values = predictionsObject[timestamp];

        let timeLabel = '00:00';
        try {
          const dateObj = new Date(timestamp);
          if (!isNaN(dateObj)) {
            const hours = String(dateObj.getUTCHours()).padStart(2, '0');
            const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
            timeLabel = `${hours}:${minutes}`;
          } else {
            console.warn(`No se pudo parsear el timestamp: ${timestamp}`);
            const timeMatch = timestamp.match(/\d{2}:\d{2}/);
            if (timeMatch) timeLabel = timeMatch[0];
          }
        } catch (e) {
          console.warn(`Error parseando timestamp ${timestamp}: ${e}`);
        }

        const intervalData = {
          timeLabel
        };
        targetVars.forEach(key => {
          intervalData[key] = values.hasOwnProperty(key) ? values[key] :
            null;
        });

        return intervalData;
      });

    return processed.filter(item => item !== null);
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetch('http://localhost:8000/results')
      .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        const processed = processWeatherPredictionData(data);

        if (processed.length > 0) {
          setFullDayData(processed);
          setStartInterval(1);
          setEndInterval(processed.length);
        } else {
            setError('No se recibieron datos de predicción válidos.');
            setFullDayData([]);
            setPredictionData([]);
        }
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setError(`No se pudieron cargar los datos: ${err.message}`);
        setFullDayData([]);
        setPredictionData([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (fullDayData.length) {
      const validStart = Math.max(1, Math.min(startInterval, fullDayData.length));
      const validEnd = Math.max(validStart, Math.min(endInterval, fullDayData.length));
      const filtered = fullDayData.slice(validStart - 1, validEnd);
      const withGen = calculateSolarGeneration(filtered);
      setPredictionData(withGen);
    } else {
      setPredictionData([]);
    }
  }, [startInterval, endInterval, fullDayData, solarSystemParams]);

  const chartData = useMemo(
    () => predictionData.map((item, idx) => ({ interval: idx + startInterval, ...item })),
    [predictionData, startInterval]
  );

  const generationStats = useMemo(() => {
    if (!predictionData.length || predictionData[0].solarPower == null) {
      return { totalEnergy: 0, peakPower: 0, averagePower: 0, capacityFactor: 0 };
    }
    const intervalHours = 5 / 60;
    const totalEnergy = predictionData.reduce((sum, item) => sum + item.solarPower * intervalHours, 0);
    const peakPower = Math.max(...predictionData.map(item => item.solarPower));
    const averagePower = predictionData.reduce((sum, item) => sum + item.solarPower, 0) / predictionData.length;
    const capacityFactor = (averagePower / solarSystemParams.capacity) * 100;

    return {
      totalEnergy: parseFloat(totalEnergy.toFixed(2)),
      peakPower: parseFloat(peakPower.toFixed(2)),
      averagePower: parseFloat(averagePower.toFixed(2)),
      capacityFactor: parseFloat(capacityFactor.toFixed(1))
    };
  }, [predictionData, solarSystemParams.capacity]);

  const TabNavigation = () => (
    <div className="tab-navigation">
      <button
        className={`tab-button ${activeTab === 'prediction' ? 'active' : ''}`}
        onClick={() => setActiveTab('prediction')}
      >
        Predicción Meteorológica
      </button>
      <button
        className={`tab-button ${activeTab === 'generation' ? 'active' : ''}`}
        onClick={() => setActiveTab('generation')}
      >
        Generación Solar
      </button>
    </div>
  );

  return (
    <div className="weather-dashboard">
      <div className="dashboard-header">
        <Link to="/" className="home-button" aria-label="Volver al inicio">
        </Link>
        <h1>Dashboard Meteorológico y Solar</h1>
        <p>Predicción y estimación fotovoltaica</p>
      </div>
      <TabNavigation />
      <div className="controls">
        <label htmlFor="startIntervalInput">Intervalo inicio:</label>
        <input
          id="startIntervalInput"
          type="number"
          min="1"
          max="288"
          value={startInterval}
          onChange={e => setStartInterval(Math.max(1, Math.min(288, +e.target.value)))}
        />
        <label htmlFor="endIntervalInput">Intervalo fin:</label>
        <input
          id="endIntervalInput"
          type="number"
          min={startInterval}
          max="288"
          value={endInterval}
          onChange={e => setEndInterval(Math.max(startInterval, Math.min(288, +e.target.value)))}
        />
      </div>
      <div className="dashboard-content">
        {renderContent()}
      </div>
      <footer className="dashboard-footer">
        Datos simulados para Medellín, Colombia. ({new Date().toLocaleDateString()})
      </footer>

      <div className="bottom-nav">
            <Link to="/" className="nav-item active">
              <Home size={24} />
              <span>Home</span>
            </Link>
            <Link to="/consumption" className="nav-item">
              <BarChart2 size={24} />
              <span>Consumo</span>
            </Link>
            <Link to="/weather" className="nav-item">
              <Battery size={24} />
              <span>Producción</span>
            </Link>
          </div>
    </div>
  );
}

export default WeatherDashboard;