from tensorflow.keras.models import load_model
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import mean_squared_error, r2_score


model_to_use = "COM-3.0.keras"
df_position = "models_media/processed_datasets/COM/"
result = "models_media/results/results.txt"

model_path =  model_to_use

# Cargar los datos de prueba
x = np.load(df_position + "x_test.npy")
y = np.load(df_position + "y_test.npy")


model = load_model(model_path)
train_predictions = model.predict(x).flatten()

# Crear DataFrame para visualizar los resultados
train_results = pd.DataFrame(data={'Train Predictions': train_predictions, 'Actuals': y})
print(train_results)


mse = mean_squared_error(y, train_predictions)
rmse = np.sqrt(mse)
r2 = r2_score(y, train_predictions)

print(f"Error Cuadrático Medio (MSE): {mse:.4f}")
print(f"Raíz del Error Cuadrático Medio (RMSE): {rmse:.4f}")
print(f"R²: {r2:.4f}")

# ==========================
# Guardar Resultados en Archivo
# ==========================
with open(result, "r+") as f:
    index = 0
    lines = f.readlines()
    for i in lines[2:]:
        if len(i.split("|")) <= 1:
            continue
        else:
            # Se asume que el índice se encuentra en la tercera posición del string
            index = int(i[2]) + 1
    f.write("| "+str(index)+" | "+str(mse)[:6]+" | "+str(rmse)[:6]+" | "+str(r2)[:6]+" | "+model_to_use+" |\n"+"---------------------------\n")

# ==========================
# Opción 1: Gráfico de Dispersión (Scatter Plot)
# ==========================
plt.figure(figsize=(10, 10))
plt.scatter(y, train_predictions, color='blue', alpha=0.6, label='Predicciones')
plt.plot([min(y), max(y)], [min(y), max(y)], color='red', linestyle='--', label='Línea Ideal (y = x)')
plt.title('Comparación de Valores Reales vs Predichos')
plt.xlabel('Valores Reales')
plt.ylabel('Valores Predichos')
plt.legend()
plt.grid(True)
plt.show()
