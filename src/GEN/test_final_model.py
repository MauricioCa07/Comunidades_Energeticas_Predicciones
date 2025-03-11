import numpy as np
import pandas as pd
import pickle
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Cargar el modelo entrenado
model = load_model('proyecto_p2/weather-1.0.keras')
saved_results = "proyecto_p2/models_media/processed_datasets/GEN/"

# Cargar metadatos y escaladores
with open(saved_results+'metadata.pkl', 'rb') as f:
    metadata = pickle.load(f)

with open(saved_results+'scaler_X.pkl', 'rb') as f:
    scaler_X = pickle.load(f)
    
with open(saved_results+'scaler_y.pkl', 'rb') as f:
    scaler_y = pickle.load(f)
    
with open(saved_results+'historical_daily_means.pkl', 'rb') as f:
    historical_daily_means = pickle.load(f)

# Obtener parámetros
window_size = metadata['window_size']
forecast_horizon = metadata['forecast_horizon']
features_extendidos = metadata['features_extendidos']
target_vars = metadata['target_vars']

# Cargar datos de prueba para evaluación
X_test = np.load(saved_results+'X_test.npy')
y_test = np.load(saved_results+'y_test.npy')
y_test_reshaped = np.load(saved_results+'y_test_reshaped.npy')

# Cargar muestra del dataframe original
df_last = pd.read_pickle(saved_results+'df_last_sample.pkl')

# Función para predecir un día completo
def predict_next_day(model, last_data, scaler_X, scaler_y):
    """
    Predice las variables climáticas para el próximo día (24 horas)
    utilizando el modelo LSTM.
    
    Args:
        model: Modelo LSTM entrenado
        last_data: DataFrame con los últimos datos (al menos window_size filas)
        scaler_X: Scaler para las features
        scaler_y: Scaler para las variables objetivo
        
    Returns:
        DataFrame con las predicciones para las próximas 24 horas
    """
    # Asegurarse de que tenemos suficientes datos
    if len(last_data) < window_size:
        raise ValueError(f"Se necesitan al menos {window_size} intervalos de datos recientes")
    
    # Preparar los datos para la predicción
    input_data = last_data.iloc[-window_size:][features_extendidos]
    
    # Escalar los datos
    input_scaled = scaler_X.transform(input_data)
    input_scaled = input_scaled.reshape(1, window_size, len(features_extendidos))
    
    # Generar predicción
    prediction_scaled = model.predict(input_scaled)
    
    # Reformatear predicción
    prediction_scaled = prediction_scaled.reshape(1, forecast_horizon, len(target_vars))
    
    # Crear fechas para las predicciones
    last_timestamp = last_data.index[-1]
    prediction_dates = [last_timestamp + timedelta(minutes=5*(i+1)) for i in range(forecast_horizon)]
    
    # Crear DataFrame para almacenar predicciones
    predictions_df = pd.DataFrame(index=prediction_dates, columns=target_vars)
    
    # Convertir predicciones escaladas a valores originales
    for i in range(forecast_horizon):
        # Invertir la normalización
        scaled_values = prediction_scaled[0, i].reshape(1, -1)
        original_values = scaler_y.inverse_transform(scaled_values)
        
        # Almacenar en DataFrame
        for j, var in enumerate(target_vars):
            predictions_df.iloc[i, j] = original_values[0, j]
    
    return predictions_df

def get_historical_prediction(date, historical_means):
    """
    Obtiene la predicción histórica para una fecha específica
    """
    day_of_week = date.weekday()
    month = date.month
    hour = date.hour
    
    key = (day_of_week, month, hour)
    if key in historical_means:
        return historical_means[key]
    else:
        # Buscar alternativa si no existe este valor exacto
        # Por ejemplo, mismo día, cualquier mes
        for potential_key in historical_means.keys():
            if potential_key[0] == day_of_week and potential_key[2] == hour:
                return historical_means[potential_key]
        
        # Si no hay coincidencia, devolver None
        return None

def predict_full_day_hybrid(df_sample):
    """
    Genera predicciones para el próximo día completo usando 
    tanto el modelo LSTM como el modelo histórico.
    """
    # Obtener la fecha y hora actual
    now = datetime.now()
    
    # Redondear a los próximos 5 minutos
    minute = now.minute
    remainder = minute % 5
    offset = 5 - remainder if remainder != 0 else 0
    start_time = now + timedelta(minutes=offset)
    start_time = start_time.replace(second=0, microsecond=0)
    
    # Obtener los últimos datos para el LSTM
    last_data = df_sample.iloc[-window_size:]
    
    # Generar predicciones LSTM para el día completo
    try:
        lstm_predictions_df = predict_next_day(model, last_data, scaler_X, scaler_y)
        
        # Añadir predicciones históricas y generar predicción híbrida
        # Usar alpha=0.7 para dar más peso al LSTM
        alpha = 0.7
        
        # Para cada intervalo de tiempo, combinar predicciones
        for timestamp in lstm_predictions_df.index:
            # Obtener predicción histórica
            hist_pred = get_historical_prediction(timestamp, historical_daily_means)
            
            if hist_pred is not None:
                # Combinar LSTM e histórico para cada variable
                for var in target_vars:
                    lstm_val = lstm_predictions_df.loc[timestamp, var]
                    hist_val = hist_pred.get(var, lstm_val)  # Usar LSTM si no hay histórico
                    
                    # Aplicar combinación ponderada
                    combined_val = alpha * lstm_val + (1-alpha) * hist_val
                    lstm_predictions_df.loc[timestamp, var] = combined_val
        
        return lstm_predictions_df
        
    except Exception as e:
        print(f"Error al generar predicciones: {e}")
        return None


# Evaluación del modelo en conjunto de prueba con métricas adicionales
print("Evaluando el modelo en el conjunto de prueba...")
predictions = model.predict(X_test)

# Reformatear para comparar con valores reales
predictions = predictions.reshape(predictions.shape[0], forecast_horizon, len(target_vars))
y_test_orig = y_test.reshape(y_test.shape[0], forecast_horizon, len(target_vars))

# Calcular métricas por variable
metrics = {}
print("\nMétricas de evaluación:")
for i, var in enumerate(target_vars):
    # Extraer predicciones para esta variable
    var_pred = predictions[:, :, i]
    var_true = y_test_orig[:, :, i]
    
    # Invertir escalado
    var_pred_flat = var_pred.flatten().reshape(-1, 1)
    var_true_flat = var_true.flatten().reshape(-1, 1)
    
    # Para invertir el escalado necesitamos crear arrays temporales
    temp_pred = np.zeros((var_pred_flat.shape[0], len(target_vars)))
    temp_true = np.zeros((var_true_flat.shape[0], len(target_vars)))
    
    temp_pred[:, i] = var_pred_flat[:, 0]
    temp_true[:, i] = var_true_flat[:, 0]
    
    # Invertir escalado
    var_pred_orig = scaler_y.inverse_transform(temp_pred)[:, i]
    var_true_orig = scaler_y.inverse_transform(temp_true)[:, i]
    
    # Calcular métricas
    mae = mean_absolute_error(var_true_orig, var_pred_orig)
    r2 = r2_score(var_true_orig, var_pred_orig)
    
    metrics[var] = {
        'MAE': mae,
        'R²': r2
    }
    
    print(f"{var}:")
    print(f"  MAE = {mae:.4f}")
    print(f"  R² = {r2:.4f}")

