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
# Parámetros del Panel PV y Térmicos (del código Colab del jefe)
# -------------------------
A = 1.6              # Panel area in m²
absorptivity = 0.9   # Fraction of solar irradiance absorbed
h0 = 10              # Base heat transfer coefficient (W/m²·°C)
k = 5                # Wind speed coefficient (W/m²·°C per m/s)
C = 5000             # Thermal capacity (J/°C)
T_ref = 25           # Reference temperature (°C)

# PV electrical parameters at STC
eta = 0.15           # Nominal efficiency
alpha = -0.004       # Temperature coefficient for efficiency (per °C)
FF = 0.75            # Fill factor
V_oc_ref = 40.0      # Open-circuit voltage at STC (V)
R_int = 0.05         # Effective internal resistance (Ohm)
beta = -0.2          # Voltage temperature coefficient (V/°C)

# -------------------------
# Funciones de Simulación del Panel PV (adaptadas del Colab)
# -------------------------
def dT_dt_model_colab(T, G, T_amb, wind_speed):
    """
    Compute the rate of change of panel temperature (lógica del Colab).
    """
    Q_in = G * A * absorptivity
    eta_adj = eta * max(1 + alpha * (T - T_ref), 0)
    P_electrical_potential = G * A * eta_adj # Potencial eléctrico, no necesariamente el P_values final de la simulación
    
    V_oc = V_oc_ref + beta * (T - T_ref)
    V_mpp = FF * V_oc
    I_mpp = P_electrical_potential / V_mpp if V_mpp > 0 else 0
    
    Q_self = I_mpp**2 * R_int
    h = h0 + k * wind_speed
    Q_out = h * A * (T - T_amb)
    
    return (Q_in + Q_self - Q_out) / C

def rk4_step_colab(T_prev, dt, G_prev, T_amb_prev, wind_speed_prev):
    """
    Realiza un paso de integración RK4 (lógica del Colab).
    """
    k1 = dT_dt_model_colab(T_prev, G_prev, T_amb_prev, wind_speed_prev)
    k2 = dT_dt_model_colab(T_prev + 0.5 * dt * k1, G_prev, T_amb_prev, wind_speed_prev) # Asumimos que G, T_amb, wind_speed no cambian significativamente en el sub-paso dt
    k3 = dT_dt_model_colab(T_prev + 0.5 * dt * k2, G_prev, T_amb_prev, wind_speed_prev)
    k4 = dT_dt_model_colab(T_prev + dt * k3, G_prev, T_amb_prev, wind_speed_prev)
    return T_prev + (dt / 6) * (k1 + 2*k2 + 2*k3 + k4)

def simulate_pv_power_with_colab_model(predicted_weather_df):
    if not all(col in predicted_weather_df.columns for col in ['ghi', 'air_temp', 'wind_speed_10m']):
        raise ValueError("El DataFrame de entrada debe contener 'ghi', 'air_temp', 'wind_speed_10m'")
    if not isinstance(predicted_weather_df.index, pd.DatetimeIndex):
        raise ValueError("El DataFrame de entrada debe tener un DatetimeIndex.")

    n_steps = len(predicted_weather_df)
    if n_steps == 0:
        return pd.Series(dtype=float)

    T_panel_values = np.zeros(n_steps)     # Panel temperature (°C)
    P_output_values = np.zeros(n_steps)    # Power output (W)

    T_panel_values[0] = predicted_weather_df['air_temp'].iloc[0] if n_steps > 0 else T_ref


    for i in range(1, n_steps):
        dt_val = (predicted_weather_df.index[i] - predicted_weather_df.index[i-1]).total_seconds()
        if dt_val <= 0:
            print(f"Advertencia: dt_val no positivo ({dt_val}s) en el índice {i}. Usando dt=300s por defecto.")
            dt_val = 300 


        G_prev = predicted_weather_df['ghi'].iloc[i-1]
        T_amb_prev = predicted_weather_df['air_temp'].iloc[i-1]
        wind_speed_prev = predicted_weather_df['wind_speed_10m'].iloc[i-1]
        
        T_panel_values[i] = rk4_step_colab(T_panel_values[i-1], dt_val, G_prev, T_amb_prev, wind_speed_prev)
        
        G_current = predicted_weather_df['ghi'].iloc[i]
        
        eta_adj = eta * max(1 + alpha * (T_panel_values[i] - T_ref), 0)
        P_output_values[i] = G_current * A * eta_adj
        if P_output_values[i] < 0:
             P_output_values[i] = 0


    if n_steps > 0:
        G_initial = predicted_weather_df['ghi'].iloc[0]
        T_panel_initial = T_panel_values[0] # Ya sea T_amb inicial o T_ref
        eta_adj_initial = eta * max(1 + alpha * (T_panel_initial - T_ref), 0)
        P_output_values[0] = G_initial * A * eta_adj_initial
        if P_output_values[0] < 0:
            P_output_values[0] = 0
            
    return pd.Series(P_output_values, index=predicted_weather_df.index)

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
    start_time = now.replace(minute=(now.minute // 5) * 5, second=0, microsecond=0) + timedelta(minutes=5)
    
    if len(df_sample) < window_size:
         print(f"Advertencia: Se necesitan {window_size} puntos de datos, pero solo hay {len(df_sample)}. Usando los disponibles.")
    
    last_data = df_sample.iloc[-window_size:] # Usar los últimos datos disponibles
    
    all_predictions = []
    last_valid_timestamp = last_data.index[-1] if not last_data.empty else start_time - timedelta(minutes=5) 

    try:
        lstm_predictions_df = predict_next_day(model, last_data, scaler_X, scaler_y)
        
        if not isinstance(lstm_predictions_df.index, pd.DatetimeIndex):
            print("Advertencia: El índice de predicción LSTM no es DatetimeIndex. Reconstruyendo fechas.")
            lstm_dates = [last_valid_timestamp + timedelta(minutes=5*(i+1)) for i in range(len(lstm_predictions_df))] # Usa len() para seguridad
            lstm_predictions_df.index = pd.to_datetime(lstm_dates)
        
        if not lstm_predictions_df.empty:
             all_predictions.append(lstm_predictions_df)
             last_valid_timestamp = lstm_predictions_df.index[-1] 
        else:
             print("Advertencia: La predicción LSTM devolvió un DataFrame vacío.")

    except Exception as e:
        print(f"Error en la predicción LSTM inicial: {e}. Se usarán solo históricos desde el último dato real.")

    steps_predicted_lstm = len(all_predictions[0]) if all_predictions else 0
    remaining_steps = total_steps - steps_predicted_lstm

    historical_data = []
    current_timestamp = last_valid_timestamp # Empezar desde el último timestamp válido (sea real o LSTM)

    if remaining_steps > 0:
        print(f"Rellenando {remaining_steps} pasos con datos históricos...")
        for i in range(remaining_steps):
            current_timestamp += timedelta(minutes=5)
            hist_pred_dict = get_historical_prediction(current_timestamp, historical_daily_means)
            current_minute = current_timestamp.minute

            hist_pred_curr_hour_dict = get_historical_prediction(current_timestamp, historical_daily_means)

            next_hour_timestamp = current_timestamp + timedelta(hours=1)
            hist_pred_next_hour_dict = get_historical_prediction(next_hour_timestamp, historical_daily_means)

            interpolated_pred_dict = {}
            if hist_pred_curr_hour_dict:
                if not hist_pred_next_hour_dict:
                    hist_pred_next_hour_dict = hist_pred_curr_hour_dict 

                for var in target_vars:
                    val_curr = hist_pred_curr_hour_dict.get(var, 0) # Default a 0 si falta
                    val_next = hist_pred_next_hour_dict.get(var, val_curr) # Default al valor actual si falta el siguiente
                    
                    minute_fraction = current_minute / 60.0 
                    
                    interpolated_value = val_curr + (val_next - val_curr) * minute_fraction
                    interpolated_pred_dict[var] = interpolated_value

                row_data = interpolated_pred_dict
                row_data['timestamp'] = current_timestamp
                historical_data.append(row_data)

            else:
                print(f"Advertencia: No se encontró promedio histórico para {current_timestamp}. Usando fallback (ceros).")
                fallback_values = {var: 0 for var in target_vars}
                fallback_values['timestamp'] = current_timestamp
                historical_data.append(fallback_values)
    
    if historical_data:
         historical_df = pd.DataFrame(historical_data)
         historical_df.set_index('timestamp', inplace=True)
         historical_df = historical_df.reindex(columns=target_vars) 
         all_predictions.append(historical_df)

    if not all_predictions:
         print("Error: No se pudieron generar predicciones (ni LSTM ni históricas).")
         return None
    
    final_predictions_df = pd.concat(all_predictions)
    
    final_predictions_df = final_predictions_df.sort_index() 
    start_prediction_time = (last_data.index[-1] if not last_data.empty else start_time - timedelta(minutes=5)) + timedelta(minutes=5)
    end_prediction_time = start_prediction_time + timedelta(minutes=5*(total_steps - 1))
    
    final_predictions_df = final_predictions_df[~final_predictions_df.index.duplicated(keep='first')]
    final_predictions_df = final_predictions_df.loc[start_prediction_time:end_prediction_time]
    
    if len(final_predictions_df) > total_steps:
        final_predictions_df = final_predictions_df.iloc[:total_steps]
    elif len(final_predictions_df) < total_steps:
         print(f"Advertencia: Se generaron solo {len(final_predictions_df)} de {total_steps} pasos.")


    return final_predictions_df
        

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

predictions_df = predict_full_day_hybrid_extended(df_last, total_steps=288)

if predictions_df is not None and not predictions_df.empty:
    print("Predicción climática (LSTM + Histórico) generada:")
    print(predictions_df.head())

    try:
        print("\nSimulando generación de energía PV con el modelo del Colab...")
        
        weather_for_pv_sim = predictions_df[['ghi', 'air_temp', 'wind_speed_10m']].copy()

        solar_power_watts_series = simulate_pv_power_with_colab_model(weather_for_pv_sim)
        
        predictions_df['solarPower'] = solar_power_watts_series / 1000.0
        
        print("\nPredicción final con generación solar (modelo Colab) en kW:")
        print(predictions_df[['solarPower'] + target_vars].head()) # Muestra solarPower y las variables climáticas
        
    except Exception as e:
        print(f"Error durante la simulación de PV con modelo Colab: {e}")
        print("La columna 'solarPower' podría no estar presente o ser incorrecta.")
        if 'solarPower' not in predictions_df: # Si falló y no se creó, añade una columna de ceros/NaN
             predictions_df['solarPower'] = 0.0 # o np.nan


else:
    print("No se pudo generar la predicción climática base.")
results = {
    "model": "weather-1.0.keras_with_Colab_PV_Sim", 
    "metrics": metrics, 
    "predictions": {}
}

if predictions_df is not None:
    if 'solarPower' not in predictions_df.columns:
        predictions_df['solarPower'] = np.nan

    predictions_dict = predictions_df.astype(object).where(pd.notnull(predictions_df), None).to_dict(orient="index")
    
    predictions_dict_str_keys = {}
    for key, value in predictions_dict.items():
        if isinstance(key, pd.Timestamp):
            str_key = key.strftime('%Y-%m-%d %H:%M:%S')
        else:
            str_key = str(key)

        processed_value = {}
        for v_key, v_val in value.items():
            processed_value[v_key] = None if pd.isna(v_val) else v_val
        predictions_dict_str_keys[str_key] = processed_value
        
    results["predictions"] = predictions_dict_str_keys


json_path = os.path.join(saved_results, "weather_results.json")
with open(json_path, "w") as json_file:
    json.dump(results, json_file, indent=4)

print(f"Resultados (con simulación PV del Colab) guardados en {json_path}")