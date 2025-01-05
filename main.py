from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Allow all origins or restrict to specific ones
CORS(app, resources={r"/api/*": {"origins": "http://localhost:8000"}})

@app.route('/')
def home():
    return jsonify({"message": "Welcome to the Disaster Relief Assistant API!"})


from resources import *

if __name__ == "__main__":
    app.run(debug=True)
