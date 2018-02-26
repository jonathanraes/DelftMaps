import json
from flask import Flask, render_template, request
import random
import sys
from datetime import datetime
import exhibitiondata

app = Flask(__name__)

@app.route('/')
def index():
	return render_template('index.html', exhibitions=exhibitiondata.exhibitions)

@app.route('/js/<path:filename>')
def serve_static(filename):
    root_dir = os.path.dirname(os.getcwd())
    return send_from_directory(os.path.join('.', 'static', 'js'), filename)

@app.route('/locations')
def delete_orders():
	return json.dumps(exhibitiondata.exhibitions)

@app.route('/getprices')
def getPrices():
	return json.dumps(database.getPrices())

@app.route("/update_price", methods=['POST'])
def updatePrices():
	products = json.loads(request.data)
	database.updatePrices(products)
	return ""

def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError('Not running with the Werkzeug Server')
    func()

if __name__ == '__main__':
	try:
		app.run(debug=True, host='0.0.0.0')
	except KeyboardInterrupt:
		print 'Shutting down...'
		shutdown_server()
