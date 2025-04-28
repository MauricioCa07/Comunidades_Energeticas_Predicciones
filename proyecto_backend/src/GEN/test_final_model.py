import os
import json
import numpy as np #./run_app
import pandas as pd
import pickle
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# -------------------------
# Cargar modelo y archivos preprocesados
# -------------------------
model = load_model('weather-1.0.keras')
saved_results = "models_media/processed_datasets/GEN/"

with open(os.path.join(saved_results, 'metadata.pkl'), 'rb') as f:
    metadata = pickle.load(f)
with open(os.path.join(saved_results, 'scaler_X.pkl'), 'rb') as f:
    scaler_X = pickle.load(f)
with open(os.path.join(saved_results, 'scaler_y.pkl'), 'rb') as f:
    scaler_y = pickle.load(f)
with open(os.path.join(saved_results, 'historical_daily_means.pkl'), 'rb') as f:
    historical_daily_means = pickle.load(f)

# Parámetros del preprocesamiento
window_size = metadata['window_size']
forecast_horizon = metadata['forecast_horizon']
features_extendidos = metadata['features_extendidos']
target_vars = metadata['target_vars']

# Cargar datos de prueba para evaluación
X_test = np.load(os.path.join(saved_results, 'X_test.npy'))
y_test = np.load(os.path.join(saved_results, 'y_test.npy'))
y_test_reshaped = np.load(os.path.join(saved_results, 'y_test_reshaped.npy'))

# Cargar muestra del dataframe original
df_last = pd.read_pickle(os.path.join(saved_results, 'df_last_sample.pkl'))
input_data = df_last.iloc[-window_size:][features_extendidos]
input_scaled = scaler_X.transform(input_data)
realInputData = input_scaled.reshape(1, window_size, len(features_extendidos))

# -------------------------
# Funciones para la predicción
# -------------------------
def predict_next_day(model, last_data, scaler_X, scaler_y):
    """
    Predice las variables climáticas para el próximo día (24 horas)
    utilizando el modelo LSTM.
    """
    if len(last_data) < window_size:
        raise ValueError(f"Se necesitan al menos {window_size} intervalos de datos recientes")
    
    input_data = last_data.iloc[-window_size:][features_extendidos]
    input_scaled = scaler_X.transform(input_data)
    input_scaled = input_scaled.reshape(1, window_size, len(features_extendidos))
    
    prediction_scaled = model.predict(input_scaled)
    prediction_scaled = prediction_scaled.reshape(1, forecast_horizon, len(target_vars))
    
    last_timestamp = last_data.index[-1]
    prediction_dates = [last_timestamp + timedelta(minutes=5*(i+1)) for i in range(forecast_horizon)]
    
    predictions_df = pd.DataFrame(index=prediction_dates, columns=target_vars)
    for i in range(forecast_horizon):
        scaled_values = prediction_scaled[0, i].reshape(1, -1)
        original_values = scaler_y.inverse_transform(scaled_values)
        for j, var in enumerate(target_vars):
            predictions_df.iloc[i, j] = original_values[0, j]
    
    return predictions_df

def get_historical_prediction(date, historical_means):
    """
    Obtiene la predicción histórica para una fecha específica.
    """
    day_of_week = date.weekday()
    month = date.month
    hour = date.hour
    key = (day_of_week, month, hour)
    if key in historical_means:
        return historical_means[key]
    else:
        for potential_key in historical_means.keys():
            if potential_key[0] == day_of_week and potential_key[2] == hour:
                return historical_means[potential_key]
        return None

def predict_full_day_hybrid_extended(df_sample, total_steps=288): 
    """
    Genera predicciones para el número total de pasos especificado.
    Usa LSTM para los primeros 'forecast_horizon' pasos.
    Usa promedios históricos para el resto.
    """
    now = datetime.now()
    # Calcula el inicio del próximo intervalo de 5 minutos
    start_time = now.replace(minute=(now.minute // 5) * 5, second=0, microsecond=0) + timedelta(minutes=5)
    
    # Asegúrate de tener suficientes datos en df_sample
    if len(df_sample) < window_size:
         print(f"Advertencia: Se necesitan {window_size} puntos de datos, pero solo hay {len(df_sample)}. Usando los disponibles.")
         # Podrías decidir devolver None o intentar continuar si tienes al menos algunos datos
         # return None 
    
    last_data = df_sample.iloc[-window_size:] # Usar los últimos datos disponibles
    
    all_predictions = []
    # Inicializa last_valid_timestamp al último tiempo real conocido antes de la predicción
    last_valid_timestamp = last_data.index[-1] if not last_data.empty else start_time - timedelta(minutes=5) 

    # 1. Intenta la predicción LSTM para los primeros 'forecast_horizon' pasos
    try:
        lstm_predictions_df = predict_next_day(model, last_data, scaler_X, scaler_y)
        
        # Verifica y corrige el índice si es necesario
        if not isinstance(lstm_predictions_df.index, pd.DatetimeIndex):
            print("Advertencia: El índice de predicción LSTM no es DatetimeIndex. Reconstruyendo fechas.")
            lstm_dates = [last_valid_timestamp + timedelta(minutes=5*(i+1)) for i in range(len(lstm_predictions_df))] # Usa len() para seguridad
            lstm_predictions_df.index = pd.to_datetime(lstm_dates)
        
        # Asegúrate de que realmente tienes predicciones LSTM
        if not lstm_predictions_df.empty:
             all_predictions.append(lstm_predictions_df)
             # Actualiza el último timestamp conocido al final de la predicción LSTM exitosa
             last_valid_timestamp = lstm_predictions_df.index[-1] 
        else:
             print("Advertencia: La predicción LSTM devolvió un DataFrame vacío.")
             # Mantenemos el last_valid_timestamp original

    # --- Bloque except corregido ---
    except Exception as e:
        print(f"Error en la predicción LSTM inicial: {e}. Se usarán solo históricos desde el último dato real.")
        # Si falla el LSTM, 'last_valid_timestamp' se mantiene como el último dato real conocido

    # 2. Calcula cuántos pasos faltan por rellenar
    steps_predicted_lstm = len(all_predictions[0]) if all_predictions else 0
    remaining_steps = total_steps - steps_predicted_lstm

    # 3. Rellenar los pasos restantes con promedios históricos
    historical_data = []
    current_timestamp = last_valid_timestamp # Empezar desde el último timestamp válido (sea real o LSTM)

    if remaining_steps > 0:
        print(f"Rellenando {remaining_steps} pasos con datos históricos...")
        for i in range(remaining_steps):
            current_timestamp += timedelta(minutes=5)
            hist_pred_dict = get_historical_prediction(current_timestamp, historical_daily_means)
            current_minute = current_timestamp.minute

            # Obtener promedio para la hora actual
            hist_pred_curr_hour_dict = get_historical_prediction(current_timestamp, historical_daily_means)

            # Obtener promedio para la SIGUIENTE hora
            next_hour_timestamp = current_timestamp + timedelta(hours=1)
            hist_pred_next_hour_dict = get_historical_prediction(next_hour_timestamp, historical_daily_means)

            interpolated_pred_dict = {}
            if hist_pred_curr_hour_dict:
                # Si no hay datos de la siguiente hora, usa solo los de la actual
                if not hist_pred_next_hour_dict:
                    hist_pred_next_hour_dict = hist_pred_curr_hour_dict 

                # Interpolar cada variable
                for var in target_vars:
                    val_curr = hist_pred_curr_hour_dict.get(var, 0) # Default a 0 si falta
                    val_next = hist_pred_next_hour_dict.get(var, val_curr) # Default al valor actual si falta el siguiente
                    
                    # Fracción de la hora (0.0 a casi 1.0)
                    minute_fraction = current_minute / 60.0 
                    
                    # Interpolación lineal
                    interpolated_value = val_curr + (val_next - val_curr) * minute_fraction
                    interpolated_pred_dict[var] = interpolated_value

                # Añadir a la lista
                row_data = interpolated_pred_dict
                row_data['timestamp'] = current_timestamp
                historical_data.append(row_data)

            else: # Fallback si ni siquiera hay datos para la hora actual
                print(f"Advertencia: No se encontró promedio histórico para {current_timestamp}. Usando fallback (ceros).")
                fallback_values = {var: 0 for var in target_vars} # Podrías usar el último valor conocido si lo rastreas
                fallback_values['timestamp'] = current_timestamp
                historical_data.append(fallback_values)
    
    # Convierte los datos históricos a DataFrame si existen
    if historical_data:
         historical_df = pd.DataFrame(historical_data)
         historical_df.set_index('timestamp', inplace=True)
         # Asegura que las columnas estén en el orden correcto
         historical_df = historical_df.reindex(columns=target_vars) 
         all_predictions.append(historical_df)

    # 4. Combinar los DataFrames
    if not all_predictions:
         print("Error: No se pudieron generar predicciones (ni LSTM ni históricas).")
         return None
    
    final_predictions_df = pd.concat(all_predictions)
    
    # Asegurar que solo tenemos 'total_steps' (por si hubo errores o solapamiento)
    # Ordenar por índice por si acaso la concatenación desordenó algo
    final_predictions_df = final_predictions_df.sort_index() 
    # Tomar solo los primeros total_steps desde el inicio esperado
    start_prediction_time = (last_data.index[-1] if not last_data.empty else start_time - timedelta(minutes=5)) + timedelta(minutes=5)
    end_prediction_time = start_prediction_time + timedelta(minutes=5*(total_steps - 1))
    
    # Filtra para asegurar el rango exacto y elimina duplicados si los hubiera
    final_predictions_df = final_predictions_df[~final_predictions_df.index.duplicated(keep='first')]
    final_predictions_df = final_predictions_df.loc[start_prediction_time:end_prediction_time]
    
    # Si aún así hay más de total_steps (raro), trunca
    if len(final_predictions_df) > total_steps:
        final_predictions_df = final_predictions_df.iloc[:total_steps]
    elif len(final_predictions_df) < total_steps:
         print(f"Advertencia: Se generaron solo {len(final_predictions_df)} de {total_steps} pasos.")


    return final_predictions_df
        

# -------------------------
# Evaluación del modelo con datos de prueba
# -------------------------
print("Evaluando el modelo en el conjunto de prueba...")
predictions = model.predict(X_test)
predictions = predictions.reshape(predictions.shape[0], forecast_horizon, len(target_vars))
y_test_orig = y_test.reshape(y_test.shape[0], forecast_horizon, len(target_vars))

metrics = {}
print("\nMétricas de evaluación:")
for i, var in enumerate(target_vars):
    var_pred = predictions[:, :, i]
    var_true = y_test_orig[:, :, i]
    
    var_pred_flat = var_pred.flatten().reshape(-1, 1)
    var_true_flat = var_true.flatten().reshape(-1, 1)
    
    temp_pred = np.zeros((var_pred_flat.shape[0], len(target_vars)))
    temp_true = np.zeros((var_true_flat.shape[0], len(target_vars)))
    
    temp_pred[:, i] = var_pred_flat[:, 0]
    temp_true[:, i] = var_true_flat[:, 0]
    
    var_pred_orig = scaler_y.inverse_transform(temp_pred)[:, i]
    var_true_orig = scaler_y.inverse_transform(temp_true)[:, i]
    
    mae = mean_absolute_error(var_true_orig, var_pred_orig)
    r2 = r2_score(var_true_orig, var_pred_orig)
    
    metrics[var] = {
        'MAE': mae,
        'R²': r2
    }
    
    print(f"{var}:")
    print(f"  MAE = {mae:.4f}")
    print(f"  R² = {r2:.4f}")

# Generar predicción híbrida para el próximo día
predictions_df = predict_full_day_hybrid_extended(df_last, total_steps=288)
if predictions_df is not None:
    print("Predicción híbrida generada:")
    print(predictions_df)
else:
    print("No se pudo generar la predicción híbrida.")


# -------------------------
# Guardar resultados en un archivo JSON
# -------------------------
results = {
    "model": "weather-1.0.keras",
    "metrics": metrics,
    "predictions": {}
}

if predictions_df is not None:
    # Convertir las claves (timestamps) a str
    predictions_dict = predictions_df.to_dict(orient="index")
    predictions_dict = { str(key): value for key, value in predictions_dict.items() }
    results["predictions"] = predictions_dict

json_path = os.path.join(saved_results, "weather_results.json")
with open(json_path, "w") as json_file:
    json.dump(results, json_file, indent=4, default=str)  # default=str para convertir valores que no sean serializables

print(f"Resultados guardados en {json_path}")
