import numpy as np
import pickle
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Bidirectional
from tensorflow.keras.callbacks import EarlyStopping

saved_results = "proyecto_p2/models_media/processed_datasets/GEN/"

# Cargar los datos preprocesados utilizando memory mapping
X_train = np.load(saved_results+'X_train.npy', mmap_mode='r')
X_val = np.load(saved_results+'X_val.npy', mmap_mode='r')
y_train_reshaped = np.load(saved_results+'y_train_reshaped.npy', mmap_mode='r')
y_val_reshaped = np.load(saved_results+'y_val_reshaped.npy', mmap_mode='r')

# Cargar metadatos
with open(saved_results+'metadata.pkl', 'rb') as f:
    metadata = pickle.load(f)

window_size = metadata['window_size']
forecast_horizon = metadata['forecast_horizon']
features_extendidos = metadata['features_extendidos']
target_vars = metadata['target_vars']

print(f"Datos cargados: X_train shape {X_train.shape}, y_train shape {y_train_reshaped.shape}")
print(f"Configuración: ventana {window_size}, horizonte {forecast_horizon}, variables objetivo {len(target_vars)}")

# Crear arquitectura LSTM modificada para manejar el horizonte de predicción mayor
model = Sequential()
model.add(Bidirectional(LSTM(128, return_sequences=True), 
                          input_shape=(window_size, len(features_extendidos))))
model.add(Dropout(0.3))
# Cambiar return_sequences a False para que solo se devuelva el último estado
model.add(LSTM(64, return_sequences=False))
model.add(Dropout(0.3))
model.add(Dense(forecast_horizon * len(target_vars)))

# Compilar el modelo
model.compile(optimizer='adam', loss='mse')
model.summary()

# Entrenar el modelo con EarlyStopping
early_stop = EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True)
history = model.fit(
    X_train, y_train_reshaped, 
    epochs=20, 
    batch_size=64,
    validation_data=(X_val, y_val_reshaped), 
    callbacks=[early_stop]
)

# Guardar el modelo entrenado
model.save('weather-1.0.keras')
print("Modelo guardado como 'weather_lstm_model.h5'")
