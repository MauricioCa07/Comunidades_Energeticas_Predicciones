from flask import Blueprint,Flask, request, jsonify, render_template
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
# This a the route that are 
# going to be executed for 
# each prediction
# ==========================
@bp.route('/predict/<model_name>', methods=['POST'])
def predict(model_name):
    try:

        if model_name not in MODELS:
            return jsonify({'error': f'Model {model_name} not found'}), 404

        input_data = request.get_json(force=True)
        
        input_array = np.array(input_data).reshape((1,47, 1))
        prediction = MODELS[model_name].predict(input_array)
        
        
        return jsonify({
            'model': model_name,
            'prediction': prediction.tolist()
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
