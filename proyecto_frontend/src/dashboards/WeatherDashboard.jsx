import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {LineChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,Legend,Area,ResponsiveContainer} from 'recharts';
import './WeatherDashboard.css'; 
import InfoTooltip from '../utilities/InfoTooltip';  
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import BottomNav from '../utilities/BottomNav.jsx';

function WeatherDashboard() {
  const [fullDayData, setFullDayData] = useState([]); 
  const [predictionData, setPredictionData] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('prediction'); 

  
  const [startInterval, setStartInterval] = useState(1);
  const [endInterval, setEndInterval] = useState(288); 

  
  const [solarSystemParams, setSolarSystemParams] = useState({
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

  
  function calculateSolarGeneration(weatherData) {
    if (!weatherData || weatherData.length === 0) return [];

    return weatherData.map(data => {
      const tempFactor = data.air_temp > 25 ? 1 - 0.005 * (data.air_temp - 25) : 1;
      const [hour, minute] = data.timeLabel.split(':').map(n => parseInt(n));
      const decimalHour = hour + minute / 60;
      const solarAngleFactor = calculateSolarAngleFactor(decimalHour, solarSystemParams.tilt);
      const cloudFactor = 1 - (data.precipitable_water / 50); 
      const rainFactor = data.precipitation_rate > 0 ? 0.8 : 1;

      let power = (data.ghi / 1000) *
                 solarSystemParams.area *
                 solarSystemParams.efficiency *
                 tempFactor *
                 solarAngleFactor *
                 cloudFactor *
                 rainFactor;

      power = Math.max(0, power);
      power = parseFloat(power.toFixed(2));

      return {
        ...data,
        solarPower: power, 
        powerFactor: parseFloat((power / solarSystemParams.capacity * 100).toFixed(1)) 
      };
    });
  }


  function calculateSolarAngleFactor(hour, tilt) {
    if (hour >= 10 && hour <= 14) {
      return 0.9 + (tilt / 100);
    } else if (hour >= 7 && hour < 10) {
      return 0.6 + (tilt / 200);
    } else if (hour > 14 && hour <= 17) {
      return 0.6 + (tilt / 200);
    } else {
      return 0.1;
    }
  }

  function generateFullDayData() {
    const fullDay = [];
    const intervals = 24 * 60 / 5;
    const medellinBase = { minTemp: 15, maxTemp: 27, minHumidity: 40, maxHumidity: 90, windAvg: 1.5, rainProbability: 0.3 };

    function getTemperatureForHour(hour, minute) {
      const decimalHour = hour + minute / 60;
      const peakHour = 13;
      const distanceToPeak = Math.min(Math.abs(decimalHour - peakHour), Math.abs(decimalHour - (peakHour + 24)), Math.abs(decimalHour - (peakHour - 24)));
      const normalizedDistance = distanceToPeak / 12;
      const tempFactor = Math.cos(normalizedDistance * Math.PI) * 0.5 + 0.5;
      const tempRange = medellinBase.maxTemp - medellinBase.minTemp;
      const baselineTemp = medellinBase.minTemp + tempRange * tempFactor;
      const randomVariation = (Math.random() - 0.5) * 1;
      return baselineTemp + randomVariation;
    }

    function getSolarRadiationForHour(hour, minute) {
      const decimalHour = hour + minute / 60;
      if (decimalHour < 6 || decimalHour > 18) return 0;
      const peakHour = 12;
      const hourFromPeak = Math.abs(decimalHour - peakHour);
      const maxRadiation = 1000;
      const radiation = maxRadiation * Math.cos((hourFromPeak / 6) * (Math.PI / 2));
      const cloudFactor = 0.7 + Math.random() * 0.3;
      return Math.max(0, radiation * cloudFactor);
    }

    function getHumidityForHour(hour, minute, temp) {
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
        if (decimalHour >= 13 && decimalHour <= 16) rainProb *= 2;
        if (humidity > 75) rainProb *= 1.5;
        const isRaining = Math.random() < rainProb;
        return isRaining ? 0.5 + Math.random() * 2.5 : 0;
    }

    function getPrecipitableWater(humidity, precipitation) {
        let baseWater = humidity / 10;
        if (precipitation > 0) baseWater += precipitation * 2;
        const randomVariation = (Math.random() - 0.5) * 2;
        return Math.max(5, Math.min(30, baseWater + randomVariation));
    }

    function getWindSpeedForHour(hour, minute) {
        const decimalHour = hour + minute / 60;
        let baseWind = medellinBase.windAvg;
        if (decimalHour >= 12 && decimalHour <= 16) baseWind *= 1.5;
        if (decimalHour >= 20 || decimalHour <= 6) baseWind *= 0.7;
        const randomVariation = (Math.random() - 0.5) * 1;
        return Math.max(0.5, baseWind + randomVariation);
    }

    function getWindDirection(hour) {
        let baseDirection = (hour >= 8 && hour <= 18) ? 45 : 225;
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
        prediction.timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

const processWeatherPredictionData = (rawData) => {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0 || !Array.isArray(rawData[0])) {
      console.error('Invalid raw weather prediction data format:', rawData);
      return []; 
  }

  
  const predictionSequence = rawData[0]; 

  const processed = predictionSequence.map((step, index) => {
      if (Array.isArray(step) && step.length > 0) {
          
          return {
              id: index + 1,
              predictionValue: step[0], 
          };
      }
      console.warn(`Unexpected step format at index ${index}:`, step);
      return null;
  }).filter(item => item !== null); 


   const simplifiedProcessed = predictionSequence.map(step => {
        if (Array.isArray(step) && step.length > 0) {
            return [step[0]];
        }
        return [0]; 
   });


  return simplifiedProcessed;

};




useEffect(() => {
  setIsLoading(true);
  setError(null);

  fetch('http://34.194.166.43:5000/results', {
    method: 'GET',
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (!data || typeof data.predictions !== 'object' || data.predictions === null) {
        console.error('Formato de respuesta inesperado: falta el objeto "predictions".', data);
        throw new Error('Formato de respuesta inesperado del backend.');
      }

      const predictionsObject = data.predictions;

      const processed = Object.keys(predictionsObject)
        .sort() // Ordena las claves (timestamps) alfabéticamente/cronológicamente
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
              console.warn(`No se pudo parsear el timestamp: ${timestamp} como Date. Intentando extraer HH:MM.`);
              const timeMatch = timestamp.match(/\d{2}:\d{2}/); // Busca un patrón HH:MM
              if (timeMatch && timeMatch[0]) {
                 timeLabel = timeMatch[0];
              } else {
                 console.warn(`No se pudo extraer HH:MM del timestamp: ${timestamp}`);
              }
            }
          } catch (e) {
            console.warn(`Error parseando timestamp ${timestamp}: ${e}`);
          }

          const intervalData = { timeLabel };
          const allPossibleVars = [...targetVars, 'solarPower', 'powerFactor']; 

          allPossibleVars.forEach(key => {
            if (values.hasOwnProperty(key) && values[key] !== null && values[key] !== undefined) {
              intervalData[key] = values[key];
            } else if (targetVars.includes(key)) {
              intervalData[key] = 0;
            }
          });

          return intervalData;
        });

      console.log(`Se procesaron ${processed.length} intervalos desde el backend para fullDayData.`);

      if (processed.length > 0) {
        setFullDayData(processed);
        setStartInterval(1); // Reinicia al inicio
        setEndInterval(Math.min(processed.length, 288)); 
      } else {
        console.warn("No se procesaron datos válidos desde el backend, intentando usar fallback de datos simulados.");
        const fallbackData = generateFullDayData();
        setFullDayData(fallbackData);
        setStartInterval(1);
        setEndInterval(fallbackData.length); 
      }
    })
    .catch(err => {
      console.error('Error al obtener predicción meteorológica del backend:', err);
      setError(err.message);

      console.warn("Usando fallback de datos simulados debido a error en fetch.");
      const fallbackData = generateFullDayData();
      setFullDayData(fallbackData);
      setStartInterval(1);
      setEndInterval(fallbackData.length);
    })
    .finally(() => {
      setIsLoading(false);
    });
}, []);




    useEffect(() => {
        if (fullDayData.length > 0) {
            const validStart = Math.max(1, Math.min(startInterval, fullDayData.length));
            const validEnd = Math.max(validStart, Math.min(endInterval, fullDayData.length));
            const filteredData = fullDayData.slice(validStart - 1, validEnd);

            if (filteredData.length === 0) {
                setPredictionData([]);
                return;
            }

            if (filteredData[0].hasOwnProperty('solarPower') && filteredData[0].solarPower !== undefined) {
                console.log("Usando solarPower proporcionado por el backend.");
                const dataConPowerFactor = filteredData.map(item => {
                    let powerFactor = item.powerFactor;
                    if ((!item.hasOwnProperty('powerFactor') || item.powerFactor === undefined) &&
                        item.solarPower !== undefined && solarSystemParams.capacity > 0) {
                        powerFactor = parseFloat((item.solarPower / solarSystemParams.capacity * 100).toFixed(1));
                    } else if (item.powerFactor === undefined) { // Si no se pudo calcular (ej. capacity es 0)
                        powerFactor = 0;
                    }
                    return {
                        ...item,
                        powerFactor: powerFactor 
                    };
                });
                setPredictionData(dataConPowerFactor);
            } else {
                console.warn("solarPower no detectado del backend o es undefined. Usando calculateSolarGeneration local.");
                const dataWithLocalGeneration = calculateSolarGeneration(filteredData);
                setPredictionData(dataWithLocalGeneration);
            }
        } else {
            setPredictionData([]);
        }
    }, [startInterval, endInterval, fullDayData, solarSystemParams]);


  const chartData = useMemo(() => predictionData.map((item, index) => ({
    interval: index + startInterval, 
    ...item
  })), [predictionData, startInterval]);

  const generationStats = useMemo(() => {
    if (!predictionData || predictionData.length === 0 || !predictionData[0]?.hasOwnProperty('solarPower')) {
      return { totalEnergy: 0, peakPower: 0, averagePower: 0, capacityFactor: 0 };
    }
    const intervalHours = 5 / 60; 
    const totalEnergy = predictionData.reduce((sum, item) => sum + (item.solarPower * intervalHours), 0);
    const peakPower = Math.max(...predictionData.map(item => item.solarPower));
    const averagePower = predictionData.reduce((sum, item) => sum + item.solarPower, 0) / predictionData.length;
    const capacityFactor = solarSystemParams.capacity > 0 ? (averagePower / solarSystemParams.capacity) * 100 : 0;

    return {
      totalEnergy: parseFloat(totalEnergy.toFixed(2)),
      peakPower: parseFloat(peakPower.toFixed(2)),
      averagePower: parseFloat(averagePower.toFixed(2)),
      capacityFactor: parseFloat(capacityFactor.toFixed(1))
    };
  }, [predictionData, solarSystemParams.capacity]);



  const handleExportExcel = useCallback(() => {
    if (!chartData || chartData.length === 0) {
      alert("No hay datos para exportar en el rango seleccionado.");
      return;
    }
  
    let dataToExport = [];
    let headers = [];
    let filename = "exportacion_datos.xlsx";
    let sheetName = "Datos"; 
  
    if (activeTab === 'prediction') {
      sheetName = "Prediccion_Clima";
      filename = `prediccion_clima_${startInterval}-${endInterval}.xlsx`;
      headers = ['Hora', ...targetVars.map(v => varLabels[v] || v)];
      dataToExport = chartData.map(item => {
        const row = { 'Hora': item.timeLabel };
        targetVars.forEach(v => {
          row[varLabels[v] || v] = item[v] ?? 'N/A';
        });
        return row;
      });
  
    } else if (activeTab === 'generation') {
      sheetName = "Generacion_Solar";
      filename = `generacion_solar_${startInterval}-${endInterval}.xlsx`;
      headers = [
          'Hora',
          'Potencia (kW)',
          '% Capacidad',
          'Radiación (W/m²)',
          'Temp (°C)',
          'Humedad (%)',
          'Precip (mm/h)'
      ];
      dataToExport = chartData.map(item => ({
        'Hora': item.timeLabel,
        'Potencia (kW)': item.solarPower ?? 'N/A',
        '% Capacidad': item.powerFactor ?? 'N/A',
        'Radiación (W/m²)': item.ghi ?? 'N/A',
        'Temp (°C)': item.air_temp ?? 'N/A',
        'Humedad (%)': item.relative_humidity ?? 'N/A',
        'Precip (mm/h)': item.precipitation_rate ?? 'N/A'
      }));
    } else {
      alert("Pestaña no reconocida para exportación.");
      return;
    }
  
    const wsData = [headers];
    dataToExport.forEach(row => {
        const rowValues = headers.map(header => row[header]);
        wsData.push(rowValues);
    });
    const ws = XLSX.utils.aoa_to_sheet(wsData);
  

    const cols = headers.map(header => ({ wch: Math.max(header.length, 15) })); 
  
  

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, filename);
  
  }, [activeTab, chartData, startInterval, endInterval, targetVars, varLabels]); 

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

          {/* Tabla de valores */}
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


        <div className="summary-section" style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', marginBottom: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          
          <div className="stat-card" style={{ textAlign: 'center', padding: '10px', minWidth: '150px', margin: '5px' }}>
            <div className="stat-value" style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#f9a825' }}>
              {generationStats.totalEnergy} kWh
            </div>
            <div className="stat-label" style={{ fontSize: '0.9em', color: '#555' }}>
              Energía Total Estimada
              <InfoTooltip text="La cantidad total de energía eléctrica (en kilovatios-hora) que se espera generar durante el período seleccionado." />
            </div>
          </div>

          <div className="stat-card" style={{ textAlign: 'center', padding: '10px', minWidth: '150px', margin: '5px' }}>
            <div className="stat-value" style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#f9a825' }}>
              {generationStats.peakPower} kW
            </div>
            <div className="stat-label" style={{ fontSize: '0.9em', color: '#555' }}>
              Potencia Pico
              {(() => {
                 if (!predictionData || predictionData.length === 0 || generationStats.peakPower <= 0) return null;
                 const peakItem = predictionData.find(item => item.solarPower === generationStats.peakPower);
                 return peakItem ? ` (aprox. ${peakItem.timeLabel})` : '';
              })()}
              <InfoTooltip text="La máxima potencia eléctrica instantánea (en kilovatios) que se espera alcanzar durante el período seleccionado, y la hora aproximada." />
            </div>
          </div>

          <div className="stat-card" style={{ textAlign: 'center', padding: '10px', minWidth: '150px', margin: '5px' }}>
            <div className="stat-value" style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#f9a825' }}>
              {generationStats.capacityFactor}%
            </div>
            <div className="stat-label" style={{ fontSize: '0.9em', color: '#555' }}>
              Factor de Capacidad
              <InfoTooltip text="El porcentaje de la capacidad máxima instalada del sistema que se utiliza en promedio durante el período seleccionado. Indica qué tan efectivamente está operando el sistema." />
            </div>
          </div>
        </div>
        {/* --- Fin Sección de Resumen Destacado --- */}

        

          {/* Gráfica de generación */}
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

          {/* --- INICIO DE LA NUEVA SECCIÓN CON GRÁFICOS DEL MODELO AVANZADO --- */}
          <div className="charts-section">
            <div className="chart-container">
              <h3>
                Potencia (Modelo Avanzado) y Temperatura Aire
                <InfoTooltip text="Potencia solar estimada (kW) con el modelo de simulación avanzado, y su relación con la temperatura del aire (°C)." />
              </h3>
              {(predictionData.length > 0 && predictionData[0]?.hasOwnProperty('solarPower') && predictionData[0]?.hasOwnProperty('air_temp')) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timeLabel" fontSize={12}/>
                    <YAxis yAxisId="leftPower" name="Potencia" unit="kW" stroke="#2ca02c" label={{ value: 'Potencia (kW)', angle: -90, position: 'insideLeft', offset:10 }} fontSize={12}/>
                    <YAxis yAxisId="rightTemp" name="Temperatura" unit="°C" orientation="right" stroke="#d62728" label={{ value: 'Temp. Aire (°C)', angle: 90, position: 'insideRight', offset:10 }} fontSize={12}/>
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="leftPower" type="monotone" dataKey="solarPower" stroke="#2ca02c" name="Potencia Estimada (Modelo Avanzado)" dot={false} />
                    <Line yAxisId="rightTemp" type="monotone" dataKey="air_temp" stroke="#d62728" name="Temperatura Aire" dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              ) : <p>No hay datos suficientes para el gráfico de Potencia vs Temperatura.</p>}
            </div>

            <div className="chart-container">
              <h3>
                Potencia (Modelo Avanzado) y Velocidad Viento
                <InfoTooltip text="Potencia solar estimada (kW) con el modelo de simulación avanzado, y su relación con la velocidad del viento (m/s)." />
              </h3>
              {(predictionData.length > 0 && predictionData[0]?.hasOwnProperty('solarPower') && predictionData[0]?.hasOwnProperty('wind_speed_10m')) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timeLabel" fontSize={12}/>
                    <YAxis yAxisId="leftPower" name="Potencia" unit="kW" stroke="#2ca02c" label={{ value: 'Potencia (kW)', angle: -90, position: 'insideLeft', offset:10 }} fontSize={12}/>
                    <YAxis yAxisId="rightWind" name="Viento" unit="m/s" orientation="right" stroke="#1f77b4" label={{ value: 'Viento (m/s)', angle: 90, position: 'insideRight', offset:10 }} fontSize={12}/>
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="leftPower" type="monotone" dataKey="solarPower" stroke="#2ca02c" name="Potencia Estimada (Modelo Avanzado)" dot={false} />
                    <Line yAxisId="rightWind" type="monotone" dataKey="wind_speed_10m" stroke="#1f77b4" name="Velocidad Viento" dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              ) : <p>No hay datos suficientes para el gráfico de Potencia vs Viento.</p>}
            </div>
          </div>
          {/* --- FIN DE LA NUEVA SECCIÓN --- */}

          {/* Factores que afectan la generación */}
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

          {/* Tabla de valores de generación */}
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

  return (
      <div className="weather-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Meteorológico y Solar</h1>
        <p>Predicción de variables y estimación de generación fotovoltaica</p>
      </div>

      <TabNavigation />

      <div className="controls">
        
        <label htmlFor="startIntervalInput">Intervalo inicio:</label>
        <input
          id="startIntervalInput"
          type="number"
          min="1"
          max={288}
          value={startInterval}
          onChange={(e) => setStartInterval(Math.min(288, Math.max(0, parseInt(e.target.value,10) || 0)))} 
          aria-label="Intervalo de inicio"
        />
        <label htmlFor="endIntervalInput">Intervalo fin:</label>
        <input
          id="endIntervalInput"
          type="number"
          min={startInterval} 
          max={288}
          value={endInterval}
          onChange={(e) =>
            setEndInterval(Math.min(288,
            Math.max(startInterval, parseInt(e.target.value,10) || startInterval)))
            }
          aria-label="Intervalo de fin"
        />
        
        <button
        onClick={handleExportExcel}
        disabled={chartData.length === 0 || isLoading}
        className="export-button"
        style={{ padding: '8px 15px', cursor: 'pointer', marginLeft: 'auto' }} 
        aria-label="Exportar datos a Excel"
      >
         <svg xmlns="http:.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '5px', verticalAlign: 'middle' }}>
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
         </svg>
         Exportar a Excel
      </button>
      </div>


      <div className="dashboard-content">
        {renderContent()}
      </div>

      <div className="bottom-nav">
            <BottomNav active={location.pathname}></BottomNav>
      </div>

    </div>
  );
}

export default WeatherDashboard;