import os
import json
import numpy as np
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

def predict_full_day_hybrid(df_sample):
    """
    Genera predicciones para el próximo día completo usando tanto el modelo LSTM
    como el modelo histórico, combinados con un factor alpha.
    """
    now = datetime.now()
    minute = now.minute
    remainder = minute % 5
    offset = 5 - remainder if remainder != 0 else 0
    start_time = now + timedelta(minutes=offset)
    start_time = start_time.replace(second=0, microsecond=0)
    
    last_data = df_sample.iloc[-window_size:]
    
    try:
        lstm_predictions_df = predict_next_day(model, last_data, scaler_X, scaler_y)
        alpha = 0.7
        for timestamp in lstm_predictions_df.index:
            hist_pred = get_historical_prediction(timestamp, historical_daily_means)
            if hist_pred is not None:
                for var in target_vars:
                    lstm_val = lstm_predictions_df.loc[timestamp, var]
                    hist_val = hist_pred.get(var, lstm_val)
                    combined_val = alpha * lstm_val + (1 - alpha) * hist_val
                    lstm_predictions_df.loc[timestamp, var] = combined_val
        return lstm_predictions_df
    except Exception as e:
        print(f"Error al generar predicciones: {e}")
        return None

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
predictions_df = predict_full_day_hybrid(df_last)
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
