from flask import Blueprint, request, jsonify, current_app


device_bp = Blueprint("device", __name__)

@device_bp.route("/device/reading/<device_id>", methods=["POST"])
def send_reading(device_id):
    data = request.get_data(as_text=True)
    params = data.split(" ")

    if(len(params) != 5):
        return jsonify({"message": "Invalid number of parameters. Expected 5 parameters."}), 400
    
    entry = {"device_id": device_id.strip(), "air_temp_c": float(params[0]), "air_humidity_pct": float(params[1]) ,
                   "air_pressure_hpa": float(params[2]), "soil_humidity_pct": float(params[3]), "soil_temp_c": float(params[4])}
    
    supabase = current_app.extensions.get("supabase_client")
    try:
        response = supabase.table("device_readings").insert(entry).execute()
    except Exception as e:
        error = str(e)
        return jsonify({"message": "Failed to insert reading into database.", 
                       "error":error}), 400
    return jsonify({"message": "Reading received and stored successfully."}), 201
    
    
    
