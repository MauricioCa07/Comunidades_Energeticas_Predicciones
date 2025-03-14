import os
import json
from flask import Blueprint, Flask, request, jsonify, render_template
from tensorflow.keras.models import load_model
import numpy as np
import pickle
import pandas as pd

bp = Blueprint("modules", __name__)


# Load all models with error handling
try:
    WEATHER_MODEL = load_model("C:/Users/ASUS/Desktop/proyecto_p2/Comunidades_Energeticas_Predicciones-main/weather-1.0.keras")
except Exception as e:
    print(f"Error loading weather model: {e}")
    WEATHER_MODEL = None

try:
    COM_MODEL = load_model("COM-2.0.keras")  
except Exception as e:
    print(f"Error loading COM model: {e}")
    COM_MODEL = None


@bp.route('/predict/weather', methods=['POST'])
def predict_weather():
    try:
        
        if WEATHER_MODEL is None:
            return jsonify({'error': 'Weather model not found or failed to load'}), 404
        
       
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        
        saved_results = os.path.join(current_dir, "..", "..", "models_media", "processed_datasets", "GEN")
        saved_results = os.path.normpath(saved_results)
        
        metadata_path = os.path.join(saved_results, "metadata.pkl")
        scaler_path = os.path.join(saved_results, "scaler_X.pkl")
        df_last_path = os.path.join(saved_results, "df_last_sample.pkl")
        
        with open(metadata_path, 'rb') as f:
            metadata = pickle.load(f)
        
        with open(scaler_path, 'rb') as f:
            scaler_X = pickle.load(f)
        
        window_size = metadata.get('window_size')
        features_extendidos = metadata.get('features_extendidos')
        
        df_last = pd.read_pickle(df_last_path)
        input_data = df_last.iloc[-window_size:][features_extendidos]
        input_scaled = scaler_X.transform(input_data)
        input_array = input_scaled.reshape(1, window_size, len(features_extendidos))
        
        # Generate prediction with the weather model
        prediction = WEATHER_MODEL.predict(input_array)
        
        return jsonify({
            'model': 'weather',
            'prediction': prediction.tolist()
        })
            
    except Exception as e:
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
            next_val = pred[0][0] 
            predictions.append(next_val)
            
            new_seq = np.concatenate((input_seq[0][1:], np.array([[next_val]])), axis=0)
            input_seq = new_seq.reshape(1, 47, 1)
            
        return jsonify({
            'model': 'com',
            'prediction': [float(pred) for pred in predictions]  
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Route to return saved JSON results
@bp.route('/results', methods=['GET'])
def get_results():
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        saved_results = os.path.join(current_dir, "..", "..", "models_media", "processed_datasets", "GEN")
        saved_results = os.path.normpath(saved_results)
        json_path = os.path.join(saved_results, "weather_results.json")
        
        with open(json_path, "r") as json_file:
            results = json.load(json_file)
            
        return jsonify(results)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500