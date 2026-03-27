from flask import Blueprint, request, jsonify, current_app


device_bp = Blueprint("device", __name__)

@device_bp.route("/device/reading", methods=["POST"])
def send_reading():
    data = request.get_data(as_text=True)
    params = data.split(" ")

    if(len(params) != 6):
        return jsonify({"message": "Invalid number of parameters. Expected 6 parameters."}), 400
    
    entry = {"device_id": params[0], "air_temp_c": float(params[1]), "air_humidity_pct": float(params[2]) ,
                   "air_pressure_hpa": float(params[3]), "soil_humidity_pct": float(params[4]), "soil_temp_c": float(params[5])}
    
    supabase = current_app.extensions.get("supabase_client")
    try:
        response = supabase.table("device_readings").insert(entry).execute()
    except:
        return jsonify({"message": "Failed to insert reading into database."}), 400
    return jsonify({"message": "Reading received and stored successfully."}), 201
    
    
    
