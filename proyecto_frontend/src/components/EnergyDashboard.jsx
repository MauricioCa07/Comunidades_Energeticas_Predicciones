import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './EnergyDashboard.css';
import { Bar } from 'recharts';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function EnergyDashboard() {
  // States for storing prediction and consumption data
  const [predictionData, setPredictionData] = useState([]);
  const [actualConsumption, setActualConsumption] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [chartData, setChartData] = useState([]);
  const [detailedChartData, setDetailedChartData] = useState([]);

  // Fetch prediction data from Flask when component mounts
  useEffect(() => {
    const fetchPrediction = async () => {
      setIsLoading(true);
      try {
        // Generate random values for actual consumption (simulating sensor data)
        const randomConsumption = Array.from({ length: 48 }, () => 
          Math.random() * 10 + 30
        );
        setActualConsumption(randomConsumption);
        
        // In a real application, replace with sensor data or user input
        const dummyInputs = Array.from({ length: 47 }, () => 
          Math.random() * 10 + 30
        );

        const response = await fetch('http://localhost:8000/predict/com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dummyInputs),
        });

        const data = await response.json();
        if (data.prediction) {
          setPredictionData(data.prediction);
        }
      } catch (error) {
        console.error('Error fetching prediction:', error);
        // Fallback data in case of error
        setPredictionData(Array(48).fill(50));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrediction();
  }, []);

  // Format chart data when prediction or consumption data changes
  useEffect(() => {
    if (predictionData.length > 0 && actualConsumption.length > 0) {
      // Format data for overview chart (every 3 hours)
      const overviewData = [];
      for (let i = 0; i < predictionData.length; i += 6) {
        const timeLabel = getTimeLabel(i);
        overviewData.push({
          time: timeLabel,
          predicted: predictionData[i],
        });
      }
      setChartData(overviewData);

      // Format data for detailed chart (every hour)
      const detailedData = [];
      for (let i = 0; i < predictionData.length; i += 2) {
        const timeLabel = getTimeLabel(i);
        detailedData.push({
          time: timeLabel,
          predicted: predictionData[i],
          actual: actualConsumption[i],
        });
      }
      setDetailedChartData(detailedData);
    }
  }, [predictionData, actualConsumption]);

  // Calculate values for display
  const totalConsumption = actualConsumption.reduce((sum, val) => sum + val, 0);
  const totalPrediction = predictionData.reduce((sum, val) => sum + val, 0);
  
  // Calculate averages for 24-hour periods (48 half-hour intervals)
  const avgConsumption = (totalConsumption / actualConsumption.length).toFixed(2);
  const avgPrediction = (totalPrediction / predictionData.length).toFixed(2);

  // Calculate efficiency metrics
  const efficiency = totalConsumption > 0 
    ? (((totalPrediction - totalConsumption) / totalPrediction) * 100).toFixed(1)
    : 0;

  // Group data into 4-hour blocks for summary view
  const getTimeBlockData = () => {
    const blocks = [];
    for (let i = 0; i < 48; i += 8) { // 8 half-hour intervals = 4 hours
      const blockConsumption = actualConsumption
        .slice(i, i + 8)
        .reduce((sum, val) => sum + val, 0);
      
      const blockPrediction = predictionData
        .slice(i, i + 8)
        .reduce((sum, val) => sum + val, 0);
      
      blocks.push({
        time: `${Math.floor(i/2)}:00 - ${Math.floor((i+8)/2)}:00`,
        actual: blockConsumption.toFixed(2),
        predicted: blockPrediction.toFixed(2),
        diff: (blockPrediction - blockConsumption).toFixed(2)
      });
    }
    return blocks;
  };

  const timeBlocks = getTimeBlockData();

  // Get time labels for chart
  const getTimeLabel = (index) => {
    const hour = Math.floor(index / 2);
    const minute = (index % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Determine class for consumption comparison
  const getComparisonClass = (value) => {
    if (value > 5) return "positive";
    if (value < -5) return "negative";
    return "neutral";
  };

  // Custom tooltip for the recharts component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-time">{`Hora: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name === 'predicted' ? 'Pronosticado: ' : 'Real: '}
              {entry.value.toFixed(2)} kWh
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render different content based on active tab
  const renderContent = () => {
    switch(activeTab) {
      case 'overview':
        return (
          <>
            <div className="stats-container">
              <div className="stat-box">
                <div className="stat-label">Consumo de las últimas 24 horas</div>
                <div className="stat-value">{avgConsumption} kWh</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Consumo Pronosticado</div>
                <div className="stat-value">{avgPrediction} kWh</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Eficiencia</div>
                <div className={`stat-value ${getComparisonClass(efficiency)}`}>
                  {efficiency}%
                </div>
              </div>
            </div>

            <div className="chart-container">
              <h3>Consumo Energético (24 horas)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Hora', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis 
                    label={{ value: 'Consumo (kWh)', angle: -90, position: 'insideLeft', offset: 10 }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar 
                    dataKey="predicted" 
                    name="Pronosticado" 
                    fill="#4a90e2" 
                    barSize={20} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Tabla de datos para la vista general */}
            <div className="info-section">
              <h3>Resumen de Predicciones</h3>
              {chartData.length > 0 ? (
                <div className="prediction-table-container">
                  <table className="prediction-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Consumo Pronosticado (kWh)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.time}</td>
                          <td>{item.predicted.toFixed(2)}</td>
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
      
      case 'details':
        return (
          <>
            <div className="info-section">
              <h3>Comparativa Detallada</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  data={detailedChartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  barGap={0}
                  barCategoryGap="15%"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }}
                    height={60}
                    label={{ value: 'Hora', position: 'insideBottom', offset: -40 }}
                  />
                  <YAxis 
                    label={{ value: 'Consumo (kWh)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar 
                    dataKey="predicted" 
                    name="Pronosticado" 
                    fill="#4a90e2"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="actual" 
                    name="Real" 
                    fill="#e05504"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Tabla de datos para la vista detallada */}
            <div className="info-section">
              <h3>Detalle de Consumo</h3>
              {detailedChartData.length > 0 ? (
                <div className="prediction-table-container">
                  <table className="prediction-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Consumo Pronosticado (kWh)</th>
                        <th>Consumo Real (kWh)</th>
                        <th>Diferencia (kWh)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedChartData.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.time}</td>
                          <td>{item.predicted.toFixed(2)}</td>
                          <td>{item.actual.toFixed(2)}</td>
                          <td className={getComparisonClass(item.predicted - item.actual)}>
                            {(item.predicted - item.actual).toFixed(2)}
                          </td>
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
      
      case 'analytics':
        return (
          <>
            <div className="info-section">
              <h3>Análisis por Bloques Horarios</h3>
              <div className="time-blocks-container">
                {timeBlocks.map((block, index) => (
                  <div key={index} className="time-block">
                    <div className="time-block-header">{block.time}</div>
                    <div className="time-block-content">
                      <div className="time-block-metric">
                        <span className="metric-label">Real:</span>
                        <span className="metric-value">{block.actual} kWh</span>
                      </div>
                      <div className="time-block-metric">
                        <span className="metric-label">Predicho:</span>
                        <span className="metric-value">{block.predicted} kWh</span>
                      </div>
                      <div className={`time-block-diff ${getComparisonClass(block.diff)}`}>
                        <span className="diff-value">{block.diff > 0 ? '+' : ''}{block.diff} kWh</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="info-section highlight">
              <h3>Resumen de Eficiencia</h3>
              <div className="efficiency-summary">
                <div className="efficiency-metric">
                <div className="metric-label" style={{ color: '#FFFFFF' }}>Consumo Total Real</div>
                  <div className="metric-value">{totalConsumption.toFixed(2)} kWh</div>
                </div>
                <div className="efficiency-metric">
                <div className="metric-label" style={{ color: '#FFFFFF' }}>Consumo Total Predicho</div>
                  <div className="metric-value">{totalPrediction.toFixed(2)} kWh</div>
                </div>
                <div className="efficiency-metric">
                <div className="metric-label" style={{ color: '#FFFFFF' }}>Diferencia</div>
                  <div className={`metric-value ${getComparisonClass(totalPrediction - totalConsumption)}`}>
                    {(totalPrediction - totalConsumption).toFixed(2)} kWh
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      
      default:
        return <div>Seleccione una opción</div>;
    }
  };
  

  return (
    <div className="weather-dashboard">
      {/* Botón de Home */}
      <Link to="/" className="home-button">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </Link>
      
      <div className="dashboard-header">
        <h1>Dashboard Energético</h1>
        <p>Monitoreo y Predicción de Consumo</p>
      </div>
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando datos...</p>
        </div>
      ) : (
        <>
          <div className="tabs-container">
            <div 
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              Vista General
            </div>
            <div 
              className={`tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              Detalles
            </div>
            <div 
              className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              Análisis
            </div>
          </div>
          
          {renderContent()}
        </>
      )}
    </div>
  );
}

export default EnergyDashboard;