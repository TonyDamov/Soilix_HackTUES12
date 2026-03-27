from flask import Blueprint, request, Response, jsonify, current_app

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
