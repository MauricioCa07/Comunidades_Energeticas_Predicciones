import os
import json
from flask import Blueprint, request, jsonify
from tensorflow.keras.models import load_model
import numpy as np
import pickle
import pandas as pd

bp = Blueprint("modules", __name__)

# Carga de modelos
try:
    WEATHER_MODEL = load_model("weather-1.0.keras")
except Exception as e:
    print(f"Error loading weather model: {e}")
    WEATHER_MODEL = None

try:
    COM_MODEL = load_model("COM-3.0.keras")
except Exception as e:
    print(f"Error loading COM model: {e}")
    COM_MODEL = None


@bp.route('/predict/weather', methods=['POST'])
def predict_weather():
    try:
        if WEATHER_MODEL is None:
            return jsonify({'error': 'Weather model not found or failed to load'}), 404

        # Paths
        base = os.path.normpath(
            os.path.join(os.path.dirname(__file__),
                         "..", "..", "models_media", "processed_datasets", "GEN")
        )
        meta_p = os.path.join(base, "metadata.pkl")
        sx_p   = os.path.join(base, "scaler_X.pkl")
        sy_p   = os.path.join(base, "scaler_y.pkl")
        df_p   = os.path.join(base, "df_last_sample.pkl")

        # Cargo metadata y scalers
        with open(meta_p, 'rb') as f:
            metadata = pickle.load(f)
        with open(sx_p, 'rb') as f:
            scaler_X = pickle.load(f)

        # Intento cargar el scaler de salida (puede no existir)
        scaler_Y = None
        if os.path.exists(sy_p):
            with open(sy_p, 'rb') as f:
                scaler_Y = pickle.load(f)

        window_size        = metadata['window_size']
        features_extendidos= metadata['features_extendidos']

        # Preparo input
        df_last    = pd.read_pickle(df_p)
        inp        = df_last.iloc[-window_size:][features_extendidos]
        inp_sc     = scaler_X.transform(inp)
        input_arr  = inp_sc.reshape(1, window_size, len(features_extendidos))

        # Predicción escalada
        pred_scaled = WEATHER_MODEL.predict(input_arr)  # e.g. (1, N) o (1, steps, features)
        arr = np.array(pred_scaled)

        # Reconstruyo flat 2D: (steps, features)
        if arr.ndim == 3:
            # salida (1, steps, features)
            flat_2d = arr[0]
            steps, feat_cnt = flat_2d.shape
        elif arr.ndim == 2:
            # salida (1, total_len)
            total_len = arr.shape[1]
            # determinar número de features
            if scaler_Y is not None:
                feat_cnt = scaler_Y.scale_.shape[0]
            else:
                feat_cnt = len(features_extendidos)
            steps = total_len // feat_cnt
            flat_2d = arr[0].reshape(steps, feat_cnt)
        else:
            # improbable, pero por si acaso
            flat_2d = arr.reshape(-1, 1)
            steps, feat_cnt = flat_2d.shape

        # Invierto escala si tengo scaler_Y y coincide el número de features
        if scaler_Y is not None and scaler_Y.scale_.shape[0] == feat_cnt:
            unscaled_2d = scaler_Y.inverse_transform(flat_2d)
        else:
            unscaled_2d = flat_2d

        # Aplano para devolver [ [ … ] ]
        flattened = unscaled_2d.flatten().tolist()
        output = [flattened]

        return jsonify({
            'model': 'weather',
            'prediction': output
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/predict/com', methods=['POST'])
def predict_com():
    try:
        if COM_MODEL is None:
            return jsonify({'error': 'COM model not found or failed to load'}), 404

        input_data = request.get_json(force=True)
        if len(input_data) != 47:
            return jsonify({'error': 'Se requieren 47 datos iniciales.'}), 400

        input_seq = np.array(input_data).reshape(1, 47, 1)
        predictions = []
        for _ in range(48):
            pred = COM_MODEL.predict(input_seq)
            next_val = float(pred[0][0])
            predictions.append(next_val)
            new_seq = np.concatenate((input_seq[0][1:], [[next_val]]), axis=0)
            input_seq = new_seq.reshape(1, 47, 1)

        return jsonify({
            'model': 'com',
            'prediction': predictions
        })

    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@bp.route('/results', methods=['GET'])
def get_results():
    try:
        base   = os.path.normpath(
            os.path.join(os.path.dirname(__file__),
                         "..", "..", "models_media", "processed_datasets", "GEN")
        )
        json_path = os.path.join(base, "weather_results.json")
        with open(json_path, "r") as jf:
            results = json.load(jf)
        return jsonify(results)
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({'error': str(e)}), 500
