from flask import Blueprint, request, Response, jsonify, current_app
from .middleware import require_auth
from datetime import datetime

api_bp = Blueprint("api", __name__)



@api_bp.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    supabase = current_app.extensions.get("supabase_client")

    try:
        response = supabase.auth.sign_in_with_password({"email": email, "password": password})
    except:
        return jsonify({"message": "Login failed"}), 400


    return jsonify({
        "message": "Login successful",
        "display_name": response.user.user_metadata.get("display_name", ""),
        "refresh_token": response.session.refresh_token,
        "access_token": response.session.access_token
    }), 200

     
@api_bp.route("/api/auth/signup", methods=["POST"])
def signup():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    display_name = data.get("display_name", "")

    supabase = current_app.extensions.get("supabase_client")
    try:
        response = supabase.auth.sign_up({"email": email, "password": password, "options": {"data": {"display_name": display_name}}})
    except:
        return jsonify({"message": "Signup failed"}), 400
    
    return jsonify({
        "message": "Signup successful",
        "display_name": response.user.user_metadata.get("display_name", "")
    }), 201


# Logout endpoint - since Supabase doesn't have a server-side logout, we just return success and let the client delete tokens
@api_bp.route("/api/auth/logout", methods=["POST"])
def logout():
    data = request.json
    access_token = data.get("access_token")

    supabase = current_app.extensions.get("supabase_client")

    try:
        response = supabase.auth.sign_out()
    except:
        return jsonify({"message": "Logout failed"}), 400
    return jsonify({"message": "Logout successful"}), 200



@api_bp.route("/api/devices", methods=["GET"])
@require_auth
def get_devices():
    user = request.user
    supabase = current_app.extensions.get("supabase_client")

    try:
        response = supabase.from_("devices").select("*").eq("owner_id", user.id).execute()
        devices = response.data
    except:
        return jsonify({"message": "Failed to fetch devices"}), 400

    return jsonify({"devices": devices}), 200


@api_bp.route("/api/devices/connect", methods=["POST"])
@require_auth
def connect_device():
    user = request.user
    supabase = current_app.extensions.get("supabase_client")

    data = request.json
    device_id = data.get("device_id")
    device_name = data.get("device_name", "Soilix Device")
    if not device_id:
        return jsonify({"message": "Device ID is required"}), 400
    
    try:
        device_res = supabase.from_("devices").select("*").eq("id", device_id).execute()
        #if device doesn't exist, create it and associate with user
    except: 
        return jsonify({"message": "Device not found"}), 404
    try:
        # Check if device exists is it connected to the user
        device = device_res.data[0] 
        if device["owner_id"] is None: 
            response = supabase.table("devices").update({"owner_id": user.id, "device_name": device_name}).eq("id", device_id).execute()
            return jsonify({"message": "Device connected successfully",
                            "name":device_name}), 200
        elif device["owner_id"] == user.id:
            return jsonify({"message": "Device is already connected to you"}), 200
        elif device["owner_id"] != user.id:
            return jsonify({"message": "Device is already connected to another user"}), 400
    except:
        return jsonify({"message": "Failed to connect device"}), 400


@api_bp.route("/api/devices/disconnect", methods=["POST"])
@require_auth
def disconnect_device():
    user = request.user
    supabase = current_app.extensions.get("supabase_client")

    data = request.json
    device_id = data.get("device_id")
    if not device_id:
        return jsonify({"message": "Device ID is required"}), 400
    
    try:
        device_res = supabase.from_("devices").select("*").eq("id", device_id).execute()
        device = device_res.data[0]
        if device["owner_id"] != user.id:
            return jsonify({"message": "Device is not connected to you"}), 400
        response = supabase.table("devices").update({"owner_id": None, "device_name":"Soilix Device"}).eq("id", device_id).execute()
        return jsonify({"message": "Device disconnected successfully"}), 200
    except:
        return jsonify({"message": "Failed to disconnect device"}), 400
    

@api_bp.route("/api/devices/<device_id>", methods=["PATCH"])
@require_auth
def rename(device_id): 
    user = request.user
    supabase = current_app.extensions.get("supabase_client")

    data = request.json
    new_name = data.get("device_name")
    if not new_name:
        return jsonify({"message": "Device name is required"}), 400
    try:
        device_res = supabase.from_("devices").select("*").eq("id", device_id).execute()
        device = device_res.data[0]
        if device["owner_id"] != user.id:
            return jsonify({"message": "Device is not connected to you"}), 400
        response = supabase.table("devices").update({"device_name": new_name}).eq("id", device_id).execute()
        return jsonify({"message": "Device renamed successfully",
                        "name": new_name}), 200
    except:
        return jsonify({"message": "Failed to rename device"}), 400