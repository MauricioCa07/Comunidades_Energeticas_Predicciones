import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler


# Cargar datos y formatear la fecha
df = pd.read_csv('models_media/datasets/EAFIT_weater.csv')
save_results = "models_media/processed_datasets/GEN/"


df['period_end'] = pd.to_datetime(df['period_end'])
df = df.sort_values('period_end')
df.set_index('period_end', inplace=True)

# Definir las variables (features) y las variables objetivo (target_vars)
features = ['air_temp', 'albedo', 'azimuth', 'clearsky_dhi', 'clearsky_dni',
            'clearsky_ghi', 'clearsky_gti', 'cloud_opacity', 'dewpoint_temp', 'dhi',
            'dni', 'ghi', 'gti', 'precipitable_water', 'precipitation_rate',
            'relative_humidity', 'surface_pressure', 'snow_depth', 'snow_water_equivalent',
            'snow_soiling_rooftop', 'snow_soiling_ground', 'wind_direction_100m',
            'wind_direction_10m', 'wind_speed_100m', 'wind_speed_10m', 'zenith']

target_vars = ['air_temp', 'ghi', 'precipitable_water', 'precipitation_rate',
               'relative_humidity', 'wind_direction_10m', 'wind_speed_10m']

# Añadir características temporales cíclicas
df['hour'] = df.index.hour
df['minute'] = df.index.minute
df['dayofyear'] = df.index.dayofyear

# Convertir variables temporales a representación cíclica
df['hour_sin'] = np.sin(2 * np.pi * df['hour']/24)
df['hour_cos'] = np.cos(2 * np.pi * df['hour']/24)
df['day_sin'] = np.sin(2 * np.pi * df['dayofyear']/365)
df['day_cos'] = np.cos(2 * np.pi * df['dayofyear']/365)

# Añadir estas nuevas características a nuestro conjunto
features_extendidos = features + ['hour_sin', 'hour_cos', 'day_sin', 'day_cos']

# Dar más peso a datos recientes
# Definir fecha de corte (últimos 5 años)
fecha_corte = df.index.max() - pd.DateOffset(years=5)
df_reciente = df[df.index >= fecha_corte]
df_historico = df[df.index < fecha_corte]

# Escalar las features para el modelo LSTM
scaler_X = StandardScaler()
scaler_y = StandardScaler()

# Escalamos utilizando principalmente los datos recientes
df_scaled_X = pd.DataFrame(
    scaler_X.fit_transform(df_reciente[features_extendidos]),
    index=df_reciente.index, 
    columns=features_extendidos
)

# Escalar también las variables objetivo para mejor rendimiento LSTM
df_scaled_y = pd.DataFrame(
    scaler_y.fit_transform(df_reciente[target_vars]),
    index=df_reciente.index,
    columns=target_vars
)

# Parámetros para predicción diaria
window_size = 72  # 6 horas (12 intervalos por hora * 6 horas)
forecast_horizon = 4  # Un día completo (12 intervalos por hora * 24 horas)

# Función para crear secuencias para el entrenamiento del LSTM
def create_sequences(data, target_data, window_size=72, forecast_horizon=4):
    X, y = [], []
    for i in range(len(data) - window_size - forecast_horizon + 1):
        X.append(data.iloc[i:i+window_size].values)
        # Para múltiples pasos de predicción
        y.append(target_data.iloc[i+window_size:i+window_size+forecast_horizon].values)
    return np.array(X), np.array(y)

# Crear secuencias a partir de los datos escalados
X, y = create_sequences(df_scaled_X, df_scaled_y, window_size=window_size, forecast_horizon=forecast_horizon)

# División en entrenamiento, validación y prueba (70% / 15% / 15%)
train_split = int(0.7 * len(X))
val_split = int(0.85 * len(X))

X_train, X_val, X_test = X[:train_split], X[train_split:val_split], X[val_split:]
y_train, y_val, y_test = y[:train_split], y[train_split:val_split], y[val_split:]

# Reshape las salidas para el modelo
y_train_reshaped = y_train.reshape(y_train.shape[0], -1)
y_val_reshaped = y_val.reshape(y_val.shape[0], -1)
y_test_reshaped = y_test.reshape(y_test.shape[0], -1)

# Calcular promedios históricos diarios para el modelo híbrido
def calcular_promedios_diarios(df, target_vars):
    """
    Calcula promedios para cada hora del día según el día de la semana y el mes
    """
    # Extraer información temporal
    df['day_of_week'] = df.index.dayofweek
    df['month'] = df.index.month
    df['hour'] = df.index.hour
    df['minute'] = df.index.minute
    
    # Añadir peso basado en la fecha (más reciente = más peso)
    max_date = df.index.max()
    df['days_from_max'] = (max_date - df.index).days
    df['weight'] = np.exp(-df['days_from_max'] / 365)  # Decay exponencial
    
    # Calcular promedios ponderados por hora (ignorando minutos)
    grouped = df.groupby(['day_of_week', 'month', 'hour'])
    
    weighted_means = {}
    for name, group in grouped:
        if len(group) > 0:
            weights = group['weight'].values
            weighted_avg = {}
            for var in target_vars:
                # Promedio ponderado
                weighted_avg[var] = np.average(group[var].values, weights=weights)
            weighted_means[name] = weighted_avg
    
    return weighted_means

# Calcular promedios diarios
historical_daily_means = calcular_promedios_diarios(df, target_vars)

# Guardar los datos procesados para usarlos en el entrenamiento
np.save(save_results+'X_train.npy', X_train)
np.save(save_results+'X_val.npy', X_val)
np.save(save_results+'X_test.npy', X_test)
np.save(save_results+'y_train_reshaped.npy', y_train_reshaped)
np.save(save_results+'y_val_reshaped.npy', y_val_reshaped)
np.save(save_results+'y_test_reshaped.npy', y_test_reshaped)
np.save(save_results+'y_test.npy', y_test)  # Guardar también la versión original para evaluación

# Guardar los escaladores y parámetros importantes
import pickle
with open(save_results+'scaler_X.pkl', 'wb') as f:
    pickle.dump(scaler_X, f)
with open(save_results+'scaler_y.pkl', 'wb') as f:
    pickle.dump(scaler_y, f)
with open(save_results+'historical_daily_means.pkl', 'wb') as f:
    pickle.dump(historical_daily_means, f)
with open(save_results+'metadata.pkl', 'wb') as f:
    pickle.dump({
        'window_size': window_size,
        'forecast_horizon': forecast_horizon,
        'features_extendidos': features_extendidos,
        'target_vars': target_vars
    }, f)

# Guardar una muestra del dataframe original para pruebas
df_last = df.iloc[-window_size-forecast_horizon:]
df_last.to_pickle(save_results+'df_last_sample.pkl')

print("Preprocesamiento completado y datos guardados.")