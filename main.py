from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
import numpy as np

app = Flask(__name__)

# ==========================
# All the models should be here 
# ==========================
MODELS = {
    'com': load_model("./finalModel.keras")
    }


# ==========================
# This a the route that are 
# going to be executed for 
# each prediction
# ==========================
@app.route('/predict/<model_name>', methods=['POST'])
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



def train_model_manually():pass





if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)