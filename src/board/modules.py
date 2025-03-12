from flask import Blueprint, Flask, request, jsonify, render_template
from tensorflow.keras.models import load_model
import numpy as np

bp = Blueprint("modules", __name__)

@bp.route("/")
def home():
    return render_template("home.html")

# ==========================
# All the models should be here 
# ==========================
MODELS = {
    'com': load_model("/home/laptop1/Desktop/codes/proyecto_p2/COM-2.0.keras")
}

# ==========================
# This is the route that will be executed for each prediction
# ==========================
@bp.route('/predict/<model_name>', methods=['POST'])
def predict(model_name):
    try:
        if model_name not in MODELS:
            return jsonify({'error': f'Model {model_name} not found'}), 404

        # Se espera un JSON con 47 valores (la secuencia inicial)
        input_data = request.get_json(force=True)
        if len(input_data) != 47:
            return jsonify({'error': 'Se requieren 47 datos iniciales.'}), 400

        # Convertir la lista a un array y darle la forma (1, 47, 1)
        input_seq = np.array(input_data).reshape(1, 47, 1)
        predictions = []

        # Iterar 48 veces para generar 48 predicciones
        for _ in range(48):
            # La predicción es un valor (suponiendo que el modelo devuelve shape (1,1))
            pred = MODELS[model_name].predict(input_seq)
            next_val = pred[0][0]  # Extraemos el valor escalar

            predictions.append(next_val)

            # Actualizamos la secuencia: eliminamos el primer dato y añadimos el valor predicho
            new_seq = np.concatenate((input_seq[0][1:], np.array([[next_val]])), axis=0)
            input_seq = new_seq.reshape(1, 47, 1)

        return jsonify({
    'model': model_name,
    'prediction': [float(pred) for pred in predictions]  # Convertimos cada número a float nativo
})


    except Exception as e:
        return jsonify({'error': str(e)}), 500
