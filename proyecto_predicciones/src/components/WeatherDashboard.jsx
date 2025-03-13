import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ResponsiveContainer
} from 'recharts';
import './WeatherDashboard.css';
import { Link } from 'react-router-dom';

function WeatherDashboard() {
  const [fullDayData, setFullDayData] = useState([]); // Todos los datos inventados para el día
  const [displayData, setDisplayData] = useState([]);   // Datos filtrados según el rango
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictionData, setPredictionData] = useState([]);
  const [activeTab, setActiveTab] = useState('prediction'); // Estado para la navegación entre tabs

  // Estados para el rango de intervalos a mostrar
  const [startInterval, setStartInterval] = useState(1);
  const [endInterval, setEndInterval] = useState(288); // 288 intervalos en 24 horas

  // Parámetros del sistema solar fotovoltaico
  const [solarSystemParams, setSolarSystemParams] = useState({
    capacity: 5, // Capacidad instalada en kW
    efficiency: 0.18, // Eficiencia de los paneles (18%)
    area: 30, // Área total de paneles en m²
    tilt: 15, // Inclinación de los paneles en grados
    azimuth: 180, // Orientación (180° = sur)
  });

  // Define las claves que se esperan, en el mismo orden que el backend
  const targetVars = [
    'air_temp', 
    'ghi', 
    'precipitable_water', 
    'precipitation_rate', 
    'relative_humidity', 
    'wind_direction_10m', 
    'wind_speed_10m'
  ];

  // Etiquetas para mostrar en los controles y tablas
  const varLabels = {
    'air_temp': 'Temperatura (°C)',
    'ghi': 'Radiación (W/m²)',
    'precipitable_water': 'Agua Precipitable (mm)',
    'precipitation_rate': 'Precipitación (mm/h)',
    'relative_humidity': 'Humedad (%)',
    'wind_direction_10m': 'Dirección del Viento (°)',
    'wind_speed_10m': 'Velocidad del Viento (m/s)'
  };

  // Función para calcular la generación de energía solar basada en los datos meteorológicos
  function calculateSolarGeneration(weatherData) {
    if (!weatherData || weatherData.length === 0) return [];
    
    return weatherData.map(data => {
      // Factor para calcular la eficiencia ajustada por temperatura
      // La eficiencia disminuye aproximadamente 0.5% por cada grado por encima de 25°C
      const tempFactor = data.air_temp > 25 ? 1 - 0.005 * (data.air_temp - 25) : 1;
      
      // Factor de incidencia de la radiación solar basado en ángulo
      // Simplificación: asumimos un factor basado en la hora del día
      const [hour, minute] = data.timeLabel.split(':').map(n => parseInt(n));
      const decimalHour = hour + minute / 60;
      const solarAngleFactor = calculateSolarAngleFactor(decimalHour, solarSystemParams.tilt);
      
      // Factor de pérdida por suciedad y nubes (basado en agua precipitable)
      const cloudFactor = 1 - (data.precipitable_water / 50); // Simplificación
      
      // Factor de pérdida por precipitación
      const rainFactor = data.precipitation_rate > 0 ? 0.8 : 1;
      
      // Potencia generada (kW)
      // GHI está en W/m², dividimos por 1000 para convertir a kW/m²
      let power = (data.ghi / 1000) * 
                 solarSystemParams.area * 
                 solarSystemParams.efficiency * 
                 tempFactor * 
                 solarAngleFactor * 
                 cloudFactor * 
                 rainFactor;
      
      // Aseguramos que la potencia no sea negativa
      power = Math.max(0, power);
      
      // Redondeamos a 2 decimales
      power = parseFloat(power.toFixed(2));
      
      return {
        ...data,
        solarPower: power, // Potencia en kW
        powerFactor: parseFloat((power / solarSystemParams.capacity * 100).toFixed(1)) // Factor de capacidad en %
      };
    });
  }
  
  // Calcula el factor de ángulo solar basado en la hora y la inclinación
  function calculateSolarAngleFactor(hour, tilt) {
    // Simplificación: mejor orientación al sol entre 10am y 2pm
    if (hour >= 10 && hour <= 14) {
      return 0.9 + (tilt / 100); // Mayor eficiencia con cierta inclinación
    } else if (hour >= 7 && hour < 10) {
      return 0.6 + (tilt / 200); // Mañana
    } else if (hour > 14 && hour <= 17) {
      return 0.6 + (tilt / 200); // Tarde
    } else {
      return 0.1; // Noche o madrugada (muy poca radiación)
    }
  }

  function generateFullDayData(baseData) {
    const fullDay = [];
    const intervals = 24 * 60 / 5; 
    
    const medellinBase = {
      minTemp: 15,    
      maxTemp: 27,   
      minHumidity: 40, 
      maxHumidity: 90, 
      windAvg: 1.5,    
      rainProbability: 0.3, 
    };
    
    function getTemperatureForHour(hour, minute) {
      const decimalHour = hour + minute / 60;
      const peakHour = 13;
      const distanceToPeak = Math.min(
        Math.abs(decimalHour - peakHour),
        Math.abs(decimalHour - (peakHour + 24)),
        Math.abs(decimalHour - (peakHour - 24))
      );
      
      const normalizedDistance = distanceToPeak / 12; // 0-1
      const tempFactor = Math.cos(normalizedDistance * Math.PI) * 0.5 + 0.5;
      
      const tempRange = medellinBase.maxTemp - medellinBase.minTemp;
      const baselineTemp = medellinBase.minTemp + tempRange * tempFactor;
      
      const randomVariation = (Math.random() - 0.5) * 1;
      
      return baselineTemp + randomVariation;
    }
    
    function getSolarRadiationForHour(hour, minute) {
      const decimalHour = hour + minute / 60;
      
      if (decimalHour < 6 || decimalHour > 18) {
        return 0;
      }
      
      const peakHour = 12;
      const hourFromPeak = Math.abs(decimalHour - peakHour);
      
      const maxRadiation = 1000; // W/m² máximo al mediodía
      const radiation = maxRadiation * Math.cos((hourFromPeak / 6) * (Math.PI / 2));
      
      const cloudFactor = 0.7 + Math.random() * 0.3;
      
      return Math.max(0, radiation * cloudFactor);
    }
    
    function getHumidityForHour(hour, minute, temp) {
      const decimalHour = hour + minute / 60;
      
      const tempRange = medellinBase.maxTemp - medellinBase.minTemp;
      const normalizedTemp = (temp - medellinBase.minTemp) / tempRange;
      
      const humidityRange = medellinBase.maxHumidity - medellinBase.minHumidity;
      const humidity = medellinBase.maxHumidity - (normalizedTemp * humidityRange);
      
      const randomVariation = (Math.random() - 0.5) * 10;
      
      return Math.min(100, Math.max(30, humidity + randomVariation));
    }
    
    function getPrecipitationForHour(hour, minute, humidity) {
      const decimalHour = hour + minute / 60;
      
      let rainProb = medellinBase.rainProbability;
      
      if (decimalHour >= 13 && decimalHour <= 16) {
        rainProb = rainProb * 2;
      }
      
      if (humidity > 75) {
        rainProb = rainProb * 1.5;
      }
      
      const isRaining = Math.random() < rainProb;
      
      if (isRaining) {
        return 0.5 + Math.random() * 2.5; // 0.5-3 mm/h
      } else {
        return 0;
      }
    }
    
    function getPrecipitableWater(humidity, precipitation) {
      let baseWater = humidity / 10; // 4-10 mm
      
      if (precipitation > 0) {
        baseWater += precipitation * 2;
      }
      
      const randomVariation = (Math.random() - 0.5) * 2;
      
      return Math.max(5, Math.min(30, baseWater + randomVariation));
    }
    
    function getWindSpeedForHour(hour, minute) {
      const decimalHour = hour + minute / 60;
      
      let baseWind = medellinBase.windAvg;
      
      if (decimalHour >= 12 && decimalHour <= 16) {
        baseWind = baseWind * 1.5;
      }
      
      if (decimalHour >= 20 || decimalHour <= 6) {
        baseWind = baseWind * 0.7;
      }
      
      const randomVariation = (Math.random() - 0.5) * 1;
      
      return Math.max(0.5, baseWind + randomVariation);
    }
    
    function getWindDirection(hour) {
      let baseDirection;
      
      if (hour >= 8 && hour <= 18) {
        baseDirection = 45;
      } else {
        baseDirection = 225;
      }
      
      const randomVariation = (Math.random() - 0.5) * 40;
      
      return (baseDirection + randomVariation + 360) % 360;
    }
    
    for (let i = 0; i < intervals; i++) {
      const prediction = {};
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setMinutes(i * 5);
      
      const hour = date.getHours();
      const minute = date.getMinutes();
      
      // Guardamos la hora en formato "HH:MM"
      prediction.timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Generar datos coherentes
      prediction.air_temp = parseFloat(getTemperatureForHour(hour, minute).toFixed(1));
      prediction.ghi = parseFloat(getSolarRadiationForHour(hour, minute).toFixed(1));
      prediction.relative_humidity = parseFloat(getHumidityForHour(hour, minute, prediction.air_temp).toFixed(1));
      prediction.precipitation_rate = parseFloat(getPrecipitationForHour(hour, minute, prediction.relative_humidity).toFixed(2));
      prediction.precipitable_water = parseFloat(getPrecipitableWater(prediction.relative_humidity, prediction.precipitation_rate).toFixed(1));
      prediction.wind_speed_10m = parseFloat(getWindSpeedForHour(hour, minute).toFixed(1));
      prediction.wind_direction_10m = parseFloat(getWindDirection(hour).toFixed(0));
      
      fullDay.push(prediction);
    }
    
    return fullDay;
  }

  useEffect(() => {
    async function fetchPrediction() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('http://127.0.0.1:8000/predict/weather', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})  // Enviamos un objeto vacío
        });
        
        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Respuesta del backend:", data);
        let baseData = [];
        
        if (data.prediction) {
          let rawPred = data.prediction;
          if (Array.isArray(rawPred) && rawPred.length === 1 && Array.isArray(rawPred[0])) {
            rawPred = rawPred[0];
          }
          const baseIntervals = rawPred.length / targetVars.length;
          for (let i = 0; i < baseIntervals; i++) {
            let obj = {};
            for (let j = 0; j < targetVars.length; j++) {
              obj[targetVars[j]] = parseFloat(rawPred[i * targetVars.length + j].toFixed(2));
            }
            baseData.push(obj);
          }
          console.log("Datos base recibidos:", baseData);
          // Generar datos para todo el día
          const fullData = generateFullDayData(baseData);
          console.log("Datos generados para el día:", fullData);
          setFullDayData(fullData);
          // Por defecto, mostrar todo el día
          setStartInterval(1);
          setEndInterval(fullData.length);
          setPredictionData(fullData);
        } else {
          console.error("La respuesta no contiene 'prediction':", data);
        }
      } catch (error) {
        console.error('Error al obtener la predicción:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchPrediction();
  }, []);

  // Función para actualizar el rango de datos a mostrar
  useEffect(() => {
    if (fullDayData.length > 0) {
      // Los intervalos son de 1 a fullDayData.length
      const filtered = fullDayData.slice(startInterval - 1, endInterval);
      const dataWithGeneration = calculateSolarGeneration(filtered); // Calculamos generación al filtrar
      setPredictionData(dataWithGeneration);
    }
  }, [startInterval, endInterval, fullDayData, solarSystemParams]);

  // Para el gráfico, se usa "timeLabel" en el eje X
  const chartData = predictionData.map((item, index) => ({
    interval: index + startInterval, // el intervalo real
    ...item
  }));

  // Calcular estadísticas de generación
  const generationStats = React.useMemo(() => {
    if (!predictionData || predictionData.length === 0 || !predictionData[0].hasOwnProperty('solarPower')) {
      return {
        totalEnergy: 0,
        peakPower: 0,
        averagePower: 0,
        capacityFactor: 0
      };
    }

    // Cada intervalo es de 5 minutos = 1/12 hora
    const intervalHours = 1 / 12;
    
    // Sumar toda la energía (kWh)
    const totalEnergy = predictionData.reduce((sum, item) => sum + (item.solarPower * intervalHours), 0);
    
    // Encontrar potencia máxima (kW)
    const peakPower = Math.max(...predictionData.map(item => item.solarPower));
    
    // Potencia promedio (kW)
    const averagePower = predictionData.reduce((sum, item) => sum + item.solarPower, 0) / predictionData.length;
    
    // Factor de capacidad (%)
    const capacityFactor = (averagePower / solarSystemParams.capacity) * 100;
    
    return {
      totalEnergy: parseFloat(totalEnergy.toFixed(2)),
      peakPower: parseFloat(peakPower.toFixed(2)),
      averagePower: parseFloat(averagePower.toFixed(2)),
      capacityFactor: parseFloat(capacityFactor.toFixed(1))
    };
  }, [predictionData, solarSystemParams.capacity]);

  // Componente para la navegación entre pestañas
const TabNavigation = () => (
  <div className="tabs-container">
    <div 
      className={`tab ${activeTab === 'prediction' ? 'active' : ''}`}
      onClick={() => setActiveTab('prediction')}
    >
      Predicción
    </div>
    <div 
      className={`tab ${activeTab === 'generation' ? 'active' : ''}`}
      onClick={() => setActiveTab('generation')}
    >
      Generación Solar
    </div>
  </div>
);

  // Renderizado condicional basado en la pestaña activa
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando predicciones...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-container">
          <p>Error al cargar las predicciones: {error}</p>
          <button onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      );
    }

    // Contenido de la pestaña predicción
    if (activeTab === 'prediction') {
      return (
        <>
          {/* Sección de gráficas */}
          <div className="charts-section">
            <div className="chart-container">
              <h3>Temperatura y Viento</h3>
              {predictionData.length > 0 ? (
                <LineChart
                  width={600}
                  height={300}
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeLabel" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="air_temp"
                    stroke="#8884d8"
                    name="Temperatura (°C)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="wind_speed_10m"
                    stroke="#f44336"
                    name="Viento (m/s)"
                  />
                </LineChart>
              ) : (
                <p>No se recibieron datos de predicción.</p>
              )}
            </div>

            <div className="chart-container">
              <h3>Humedad y Precipitación</h3>
              {predictionData.length > 0 ? (
                <LineChart
                  width={600}
                  height={300}
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeLabel" />
                  <YAxis yAxisId="left" domain={[0, 100]} />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="relative_humidity"
                    stroke="#2196f3"
                    name="Humedad (%)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="precipitation_rate"
                    stroke="#4caf50"
                    name="Precipitación (mm/h)"
                  />
                </LineChart>
              ) : (
                <p>No se recibieron datos de predicción.</p>
              )}
            </div>
          </div>

          {/* Tabla de valores */}
          <div className="info-section">
            <h3>Resumen de Predicciones</h3>
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
            ) : (
              <p>No se recibieron datos de predicción.</p>
            )}
          </div>
        </>
      );
    }
    
    // Contenido de la pestaña generación
    else if (activeTab === 'generation') {
      return (
        <>
          <div className="generation-header">
            <h2>Estimación de Generación Solar Fotovoltaica</h2>
            <p>Basado en las condiciones meteorológicas y los parámetros del sistema</p>
          </div>

          {/* Resumen de estadísticas */}
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

          {/* Gráfica de generación */}
          <div className="charts-section">
            <div className="chart-container full-width">
              <h3>Generación Solar y Radiación</h3>
              {predictionData.length > 0 && predictionData[0].hasOwnProperty('solarPower') ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timeLabel" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 1000]} />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="solarPower"
                      stroke="#f9a825"
                      fill="#ffd54f"
                      name="Potencia Solar (kW)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="ghi"
                      stroke="#ff7043"
                      name="Radiación Solar (W/m²)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p>No se calcularon datos de generación.</p>
              )}
            </div>
          </div>

          {/* Factores que afectan la generación */}
          <div className="charts-section">
            <div className="chart-container">
              <h3>Impacto de la Temperatura</h3>
              {predictionData.length > 0 ? (
                <LineChart
                  width={600}
                  height={300}
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeLabel" />
                  <YAxis yAxisId="left" domain={[0, Math.max(...chartData.map(item => item.solarPower)) * 1.2]} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 40]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="solarPower"
                    stroke="#f9a825"
                    name="Potencia (kW)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="air_temp"
                    stroke="#e53935"
                    name="Temperatura (°C)"
                  />
                </LineChart>
              ) : (
                <p>No se recibieron datos de predicción.</p>
              )}
            </div>

            <div className="chart-container">
              <h3>Impacto de la Nubosidad</h3>
              {predictionData.length > 0 ? (
                <LineChart
                  width={600}
                  height={300}
                  data={chartData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timeLabel" />
                  <YAxis yAxisId="left" domain={[0, Math.max(...chartData.map(item => item.solarPower)) * 1.2]} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="solarPower"
                    stroke="#f9a825"
                    name="Potencia (kW)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="relative_humidity"
                    stroke="#42a5f5"
                    name="Humedad (%)"
                  />
                </LineChart>
              ) : (
                <p>No se recibieron datos de predicción.</p>
              )}
            </div>
          </div>

          {/* Tabla de valores de generación */}
          <div className="info-section">
            <h3>Detalles de Generación</h3>
            {predictionData.length > 0 && predictionData[0].hasOwnProperty('solarPower') ? (
              <div className="prediction-table-container">
                <table className="prediction-table">
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Potencia (kW)</th>
                      <th>% de Capacidad</th>
                      <th>Radiación (W/m²)</th>
                      <th>Temperatura (°C)</th>
                      <th>Humedad (%)</th>
                      <th>Precipitación (mm/h)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictionData.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.timeLabel}</td>
                        <td>{item.solarPower}</td>
                        <td>{item.powerFactor}%</td>
                        <td>{item.ghi}</td>
                        <td>{item.air_temp}</td>
                        <td>{item.relative_humidity}</td>
                        <td>{item.precipitation_rate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No se calcularon datos de generación.</p>
            )}
          </div>
        </>
      );
    }
  };

  return (
      <div className="weather-dashboard">
      <div className="dashboard-header">
        {/* Botón de Home */}
        <Link to="/" className="home-button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </Link>
        <h1>Dashboard de Predicción Meteorológica</h1>
        <p>Predicción de variables meteorológicas y estimación de generación solar fotovoltaica</p>
      </div>
      
      
      <TabNavigation />

      {/* Controles para seleccionar intervalos */}
      <div className="controls">
        <label>
          Intervalo inicio:
          <input
            type="number"
            min="1"
            max={fullDayData.length}
            value={startInterval}
            onChange={(e) => setStartInterval(parseInt(e.target.value))}
          />
        </label>
        <label>
          Intervalo fin:
          <input
            type="number"
            min="1"
            max={fullDayData.length}
            value={endInterval}
            onChange={(e) => setEndInterval(parseInt(e.target.value))}
          />
        </label>
        
      </div>

      <div className="dashboard-content">
        {renderContent()}
      </div>
    
    </div>
  );
}

export default WeatherDashboard;
