import React, { useEffect, useState,useCallback } from 'react';
import { Link } from 'react-router-dom';
import './EnergyDashboard.css';
import InfoTooltip from './InfoTooltip.jsx';
import {XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart2, Home, Battery } from 'lucide-react';
import * as XLSX from 'xlsx'; 
import { saveAs } from 'file-saver';

function EnergyDashboard() {
  const [predictionData, setPredictionData] = useState([]);
  const [actualConsumption, setActualConsumption] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [chartData, setChartData] = useState([]);
  const [detailedChartData, setDetailedChartData] = useState([]);

  useEffect(() => {
    const fetchPrediction = async () => {
      setIsLoading(true);
      try {
        const randomConsumption = Array.from({ length: 48 }, () =>
          Math.random()/3
        );
        setActualConsumption(randomConsumption);

        const dummyInputs = randomConsumption.slice(0, 47);

        const response = await fetch('http://54.234.57.47:5000/predict/com', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dummyInputs),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.prediction && Array.isArray(data.prediction)) {
            setPredictionData(data.prediction);
        } else {
             console.warn("Prediction data not found or not in expected format:", data);
             setPredictionData(Array(48));
        }

      } catch (error) {
        console.error('Error fetching prediction:', error);
        setPredictionData(Array(48));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrediction();
  }, []);

  useEffect(() => {
    if (predictionData.length === 48 && actualConsumption.length === 48) {
      const overviewData = [];
      for (let i = 0; i < 48; i += 6) {
        const timeLabel = getTimeLabel(i);
        overviewData.push({
          time: timeLabel,
          predicted: predictionData[i] || 0,
        });
      }
      setChartData(overviewData);

      const detailedData = [];
      for (let i = 0; i < 48; i += 2) {
        const timeLabel = getTimeLabel(i);
        detailedData.push({
          time: timeLabel,
          predicted: predictionData[i] || 0,
          actual: actualConsumption[i] || 0,
        });
      }
      setDetailedChartData(detailedData);
    } else {
        setChartData([]);
        setDetailedChartData([]);
    }
  }, [predictionData, actualConsumption]);

  const handleExportExcel = useCallback(() => {
    if (!detailedChartData || detailedChartData.length === 0) {
      alert("No hay datos detallados para exportar.");
      return;
    }

    const sheetName = "Consumo_Detallado";
    const filename = `reporte_consumo_energetico_${Date.now()}.xlsx`; 

    const headers = [
      'Hora',
      'Pronosticado (kWh)',
      'Real (kWh)',
      'Diferencia (kWh)'
    ];

  
    const dataToExport = detailedChartData.map(item => {
        const predicted = item.predicted ?? 0; 
        const actual = item.actual ?? 0;     
        const difference = predicted - actual;
        return {
            'Hora': item.time,
            'Pronosticado (kWh)': predicted, 
            'Real (kWh)': actual,           
            'Diferencia (kWh)': difference      
        };
    });


    const wsData = [headers]; 
    dataToExport.forEach(row => {
      const rowValues = headers.map(header => row[header]);
      wsData.push(rowValues);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);


    const cols = headers.map(header => ({
        wch: Math.max(header.length, 15) 
    }));
    ws['!cols'] = cols; 


    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });

    saveAs(blob, filename);

  }, [detailedChartData]);


  const { totalConsumption, totalPrediction, avgConsumption, avgPrediction, efficiency } = React.useMemo(() => {
    const tc = actualConsumption.reduce((sum, val) => sum + (val || 0), 0);
    const tp = predictionData.reduce((sum, val) => sum + (val || 0), 0);
    const avgC = actualConsumption.length > 0 ? (tc / actualConsumption.length) : 0;
    const avgP = predictionData.length > 0 ? (tp / predictionData.length) : 0;
    const eff = tp > 0 ? (((tp - tc) / tp) * 100) : 0;

    return {
      totalConsumption: tc,
      totalPrediction: tp,
      avgConsumption: avgC.toFixed(2),
      avgPrediction: avgP.toFixed(2),
      efficiency: eff.toFixed(1),
    };
  }, [actualConsumption, predictionData]);

  const timeBlocks = React.useMemo(() => {
    const blocks = [];
    if (actualConsumption.length === 48 && predictionData.length === 48) {
        for (let i = 0; i < 48; i += 8) {
            const blockConsumption = actualConsumption
            .slice(i, i + 8)
            .reduce((sum, val) => sum + (val || 0), 0);

            const blockPrediction = predictionData
            .slice(i, i + 8)
            .reduce((sum, val) => sum + (val || 0), 0);

            blocks.push({
            time: `${Math.floor(i/2)}:00 - ${Math.floor((i+8)/2)}:00`,
            actual: blockConsumption.toFixed(2),
            predicted: blockPrediction.toFixed(2),
            diff: (blockPrediction - blockConsumption).toFixed(2)
            });
        }
    }
    return blocks;
  }, [actualConsumption, predictionData]);

  const getTimeLabel = (index) => {
    const hour = Math.floor(index / 2);
    const minute = (index % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const getComparisonClass = (value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return "neutral";
    if (numericValue > 5) return "positive";
    if (numericValue < -5) return "negative";
    return "neutral";
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-time">{`Hora: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)} kWh
            </p>
          ))}
          {payload.length === 2 && (
             <p style={{ marginTop: '5px', fontWeight: 'bold' }}>
                Diferencia: {(payload[0].value - payload[1].value).toFixed(2)} kWh
             </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (predictionData.length === 0 || actualConsumption.length === 0) {
        return <p>No hay datos disponibles para mostrar.</p>;
    }

    switch(activeTab) { 
      case 'overview':
        return (
          <>
            <div className="stats-container">
              <div className="stat-box">
                <div className="stat-label">Consumo Promedio (Últimas 24h)</div>
                <div className="stat-value">{avgConsumption} kWh</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Predicción Promedio (Próximas 24h)</div>
                <div className="stat-value">{avgPrediction} kWh</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Acierto Predicción vs Real</div>
                <div className={`stat-value ${getComparisonClass(efficiency)}`}>
                  {efficiency}%
                </div>
              </div>
            </div>

            <div className="chart-container">
              <h3>
                Consumo Energético Pronosticado (Próximas 24h)
                <InfoTooltip text="Gráfico que muestra el consumo energético pronosticado (kWh) cada 3 horas durante las próximas 24 horas." />
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Hora', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis
                    label={{ value: 'Consumo (kWh)', angle: -90, position: 'insideLeft', offset: 10 }}
                    domain={[0, 'auto']}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(39, 174, 96, 0.1)' }}/>
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Pronosticado"
                    stroke="#27AE60"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    fill="#6FCF97"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="info-section">
              <h3>
                Resumen de Predicciones (Cada 3 Horas)
                <InfoTooltip text="Tabla con los valores numéricos del consumo energético pronosticado (kWh) para cada intervalo de 3 horas mostrado en el gráfico superior." />
              </h3>
              {chartData.length > 0 ? (
                <div className="prediction-table-container">
                  <table className="prediction-table">
                    <thead>
                      <tr>
                        <th>Hora Inicio Bloque</th>
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
            <div className="info-section chart-container">
              <h3>
                Comparativa Detallada (Real vs. Pronosticado)
                <InfoTooltip text="Gráfico que compara el consumo energético pronosticado (kWh) con el consumo real simulado (kWh) para cada hora de las últimas 24 horas." />
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={detailedChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }}
                    height={50}
                    interval={1}
                  />
                  <YAxis
                    label={{ value: 'Consumo (kWh)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 'auto']}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(39, 174, 96, 0.1)' }}/>
                  <Legend verticalAlign="top" height={36} />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Pronosticado"
                    stroke="#27AE60"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Real"
                    stroke="#F2994A"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="info-section">
              <h3>
                Detalle de Consumo (Cada Hora)
                <InfoTooltip text="Tabla con los valores numéricos detallados del consumo pronosticado, el consumo real simulado y la diferencia entre ambos para cada hora." />
              </h3>
              {detailedChartData.length > 0 ? (
                <div className="prediction-table-container">
                  <table className="prediction-table">
                    <thead>
                      <tr>
                        <th>Hora</th>
                        <th>Pronosticado (kWh)</th>
                        <th>Real (kWh)</th>
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
                <p>No se recibieron datos detallados.</p>
              )}
            </div>
          </>
        );

      case 'analytics':
        return (
          <>
            <div className="info-section">
              <h3>
                Análisis por Bloques Horarios (4 Horas)
                <InfoTooltip text="Resumen del consumo real simulado y predicho agrupado en bloques de 4 horas, mostrando la diferencia absoluta en cada bloque." />
              </h3>
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
              <h3>
                Resumen de Eficiencia (24 Horas)
                <InfoTooltip text="Comparación del consumo total real simulado y predicho durante las últimas 24 horas, indicando la diferencia global y el porcentaje de acierto." />
              </h3>
              <div className="efficiency-summary">
                <div className="efficiency-metric">
                  <span className="metric-label" style={{ color: '#FFFFFF' }}>Consumo Total Real</span>
                  <span className="metric-value">{totalConsumption.toFixed(2)} kWh</span>
                </div>
                <div className="efficiency-metric">
                  <span className="metric-label" style={{ color: '#FFFFFF' }}>Consumo Total Predicho</span>
                  <span className="metric-value">{totalPrediction.toFixed(2)} kWh</span>
                </div>
                <div className="efficiency-metric">
                  <span className="metric-label" style={{ color: '#FFFFFF' }}>Diferencia Total</span>
                  <span className={`metric-value ${getComparisonClass(totalPrediction - totalConsumption)}`}>
                    {(totalPrediction - totalConsumption).toFixed(2)} kWh
                  </span>
                </div>
                 <div className="efficiency-metric">
                  <span className="metric-label" style={{ color: '#FFFFFF' }}>Acierto Global</span>
                  <span className={`metric-value ${getComparisonClass(efficiency)}`}>
                    {efficiency}%
                  </span>
                </div>
              </div>
            </div>
          </>
        );

      default:
        return <div>Seleccione una pestaña para ver el contenido.</div>;
    }
  };

  return (
    <div className="energy-dashboard">
      <div className="header-circles">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
        <div className="circle circle-4"></div>
      </div>

      <div className="dashboard-content">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Cargando datos y predicciones...</p>
          </div>
        ) : (
          <>
            <div className="nav-tabs">
              <div
                className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
                role="tab"
                aria-selected={activeTab === 'overview'}
              >
                Vista General
              </div>
              <div
                className={`nav-tab ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
                role="tab"
                aria-selected={activeTab === 'details'}
              >
                Detalles
              </div>
              <div
                className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
                role="tab"
                aria-selected={activeTab === 'analytics'}
              >
                Análisis
              </div>
            </div>


            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 20px', borderBottom: '1px solid #eee' }}>
              <button
                onClick={handleExportExcel}
                disabled={detailedChartData.length === 0 || isLoading} 
                className="export-button" 
                style={{ padding: '8px 15px', cursor: 'pointer' }}
                aria-label="Exportar datos detallados a Excel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ marginRight: '5px', verticalAlign: 'middle' }}>
                  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                </svg>
                Exportar Detalles a Excel
              </button>
            </div>

            <div className="tab-content">
              {renderContent()}
              
            </div>
          </>
        )}
      </div>


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

export default EnergyDashboard;