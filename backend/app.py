from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return jsonify({
        "status": "success",
        "message": "Chitraksha backend running"
    })

@app.route("/api")
def api():
    return jsonify({
        "api": "working"
    })

if __name__ == "__main__":
    app.run(debug=True)