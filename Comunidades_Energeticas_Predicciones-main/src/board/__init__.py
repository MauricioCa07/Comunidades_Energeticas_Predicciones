from flask import Flask
from . import modules
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app)
    app.register_blueprint(modules.bp)
    return app

