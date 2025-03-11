from flask import Flask
from board import modules

def create_app():
    app = Flask(__name__)

    app.register_blueprint(modules.bp)
    return app

