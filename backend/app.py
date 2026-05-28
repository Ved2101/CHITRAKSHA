from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify({
        "message": "Chitraksha Backend Running Successfully"
    })

@app.route("/api")
def api():
    return jsonify({
        "status": "success"
    })

if __name__ == "__main__":
    app.run()