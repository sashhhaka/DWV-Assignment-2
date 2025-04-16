from flask import Flask, request, jsonify, render_template
import json

app = Flask(__name__)

# Global list to store packages in memory
received_packages = []

@app.route("/api/packets", methods=["POST"])
def receive_packet():
    payload = request.get_json()
    if payload:
        received_packages.append(payload)
        print("Received package:", payload)
        return "OK", 200
    else:
        return "Missing JSON payload", 400

@app.route("/data", methods=["GET"])
def get_data():
    return jsonify(received_packages)

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
