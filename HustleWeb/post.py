"""
Routes API pour l'application Game Store

Architecture:
- FastAPI pour le framework web avec validation Pydantic
- SQLAlchemy ORM pour la base de données
- JWT pour authentification stateless
- WebSocket pour chat temps réel
- Middleware de sécurité pour validation/protection

Endpoints principaux:
- Authentification: /signup, /login, /logout
- Jeux: /games/add, /purchase, /games/rate
- Administration: /admin/ban, /admin/unban
- Reset password: /forgot, /validate-code, /reset-password
- WebSocket: /ws/game/{game_id} pour chat temps réel
"""
from fastapi import Request, Form, HTTPException, APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import timedelta, timezone, datetime
from fastapi import File, UploadFile
import os
import pathlib
from pathlib import Path
from pydantic import BaseModel
from typing import Dict, List
import json
import random

from backend import (
   get_db, create_user, authenticate_user, 
   create_game, ban_user, create_jwt, hash_password, unban_user
)
from models import User, Game, Purchase, Rating, Message
from middleware import (
   SecurityMiddleware, AuthMiddleware, ValidationMiddleware,
   get_validated_user, get_validated_admin
)

# ================== MODÈLES PYDANTIC ==================
class RatingRequest(BaseModel):
   """Modèle pour noter un jeu (1-5 étoiles)"""
   game_id: int
   rating: int

class ForgotRequest(BaseModel):
   """Modèle pour demande réinitialisation mot de passe"""
   email: str

class CodeValidation(BaseModel):
   """Modèle pour validation code à 6 chiffres"""
   email: str
   code: str

class ResetRequest(BaseModel):
   """Modèle pour réinitialiser mot de passe"""
   email: str
   new_password: str

# ================== GESTIONNAIRE WEBSOCKET ==================
class ConnectionManager:
   """
   Gestionnaire connexions WebSocket pour chat temps réel
   - Connexions groupées par game_id
   - Broadcast automatique aux connectés d'un même jeu
   """
   def __init__(self):
       self.active_connections: Dict[int, List[WebSocket]] = {}

   async def connect(self, websocket: WebSocket, game_id: int):
       """Accepte et enregistre nouvelle connexion WebSocket"""
       await websocket.accept()
       if game_id not in self.active_connections:
           self.active_connections[game_id] = []
       self.active_connections[game_id].append(websocket)

   def disconnect(self, websocket: WebSocket, game_id: int):
       """Retire connexion et nettoie structures"""
       if game_id in self.active_connections:
           if websocket in self.active_connections[game_id]:
               self.active_connections[game_id].remove(websocket)
           if not self.active_connections[game_id]:
               del self.active_connections[game_id]

   async def broadcast_to_game(self, game_id: int, message: dict):
       """Diffuse message à tous les connectés d'un jeu"""
       if game_id not in self.active_connections:
           return
       
       connections = self.active_connections[game_id].copy()
       disconnected = []
       
       for connection in connections:
           try:
               await connection.send_text(json.dumps(message))
           except Exception:
               disconnected.append(connection)
       
       for conn in disconnected:
           self.disconnect(conn, game_id)

# Configuration
manager = ConnectionManager()
router = APIRouter()
templates_path = pathlib.Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=templates_path)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
router.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

# Stockage temporaire codes réinitialisation (15min)
reset_codes = {}

# ================== AUTHENTIFICATION ==================

@router.post("/signup")
async def register_user(request: Request, username: str = Form(...), email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
   """
   Inscription nouvel utilisateur
   - Validation stricte username/email/password
   - Hash password avant stockage
   - Redirection /login si succès
   """
   try:
       validated_data = ValidationMiddleware.validate_user_registration(username, email, password)
       user = create_user(db, **validated_data)
       
       if not user:
           return templates.TemplateResponse("auth/signup.html", {"request": request, "error": "Username or email already exists"}, status_code=400)
       
       return RedirectResponse(url="/login", status_code=303)
       
   except HTTPException as e:
       return templates.TemplateResponse("auth/signup.html", {"request": request, "error": e.detail}, status_code=e.status_code)

@router.post("/login")
async def login(request: Request, username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
   """
   Connexion avec génération JWT
   - Vérifie credentials et statut non banni
   - Cookie httponly sécurisé 24h
   - Retour JSON avec flag admin
   """
   username = SecurityMiddleware.validate_username(username)
   user = authenticate_user(db, username=username, password=password)
   
   if not user:
       return JSONResponse(status_code=401, content={"success": False, "error": "Invalid credentials"})
   
   if user.is_banned:
       return JSONResponse(status_code=403, content={"success": False, "error": "Account is banned"})
   
   token = create_jwt(user.user_id)
   response = JSONResponse({"success": True, "isAdmin": user.is_admin})
   response.set_cookie(key="token", value=token, httponly=True, samesite="Lax", secure=False, path="/", max_age=86400)
   
   return response

@router.post("/logout")
async def logout():
   """Déconnexion - supprime cookie JWT"""
   response = JSONResponse({"success": True})
   response.delete_cookie(key="token", path="/", samesite="Lax")
   return response

# ================== PROFIL ==================

@router.post("/profile/update")
async def update_profile(photo: UploadFile = File(...), user: User = Depends(get_validated_user), db: Session = Depends(get_db)):
   """
   Upload photo de profil
   - Type image uniquement, max 5MB
   - Sauvegardé en user_id.jpg
   - MAJ DB avec nouveau chemin
   """
   try:
       if not photo.content_type.startswith('image/'):
           raise HTTPException(400, "File must be an image")
       
       if photo.size > 5 * 1024 * 1024:
           raise HTTPException(400, "File too large (max 5MB)")

       PHOTOS_DIR = os.path.join(BASE_DIR, "static", "photos")
       os.makedirs(PHOTOS_DIR, exist_ok=True)

       filename = f"{user.user_id}.jpg"
       filepath = os.path.join(PHOTOS_DIR, filename)

       with open(filepath, "wb") as f:
           contents = await photo.read()
           f.write(contents)

       user.photo_url = f"/static/photos/{filename}"
       db.commit()
       
       return {"success": True, "photo_url": user.photo_url}

   except HTTPException:
       raise
   except Exception:
       db.rollback()
       raise HTTPException(500, "Upload failed")

# ================== JEUX ==================

@router.post("/games/add")
async def add_new_game(request: Request, title: str = Form(...), price: float = Form(...), description: str = Form(...), publisher: str = Form(...), category: str = Form(...), platforms: str = Form(...), admin: User = Depends(get_validated_admin), db: Session = Depends(get_db)):
   """
   Ajout nouveau jeu (admin only)
   - Validation complète de tous les champs
   - Protection XSS via bleach
   """
   try:
       validated_data = ValidationMiddleware.validate_game_data(title, price, description, publisher, category, platforms)
       game = create_game(db, **validated_data)
       if not game:
           raise HTTPException(400, "Could not create game")

       return RedirectResponse(url="/games", status_code=303)
       
   except HTTPException:
       raise

@router.post("/purchase/{game_id}")
async def purchase_game(game_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_validated_user)):
   """
   Achat d'un jeu
   - Vérifie existence jeu et non possession
   - Stocke prix historique dans Purchase
   """
   game = db.query(Game).filter(Game.game_id == game_id).first()
   if not game:
       raise HTTPException(404, "Game not found")
   
   existing_purchase = db.query(Purchase).filter(Purchase.user_id == current_user.user_id, Purchase.game_id == game_id).first()
   
   if existing_purchase:
       raise HTTPException(400, "Game already purchased")

   try:
       new_purchase = Purchase(user_id=current_user.user_id, game_id=game_id, price=game.price, purchase_date=datetime.now(timezone.utc))
       db.add(new_purchase)
       db.commit()
       return {"success": True, "message": "Purchase successful"}
       
   except Exception:
       db.rollback()
       raise HTTPException(500, "Purchase failed")

@router.post("/games/rate")
async def rate_game(evaluation: RatingRequest, db: Session = Depends(get_db), user: User = Depends(get_validated_user)):
   """
   Noter un jeu (propriétaires uniquement)
   - Note 1-5, vérifie possession
   - Recalcule moyenne du jeu automatiquement
   """
   rating = SecurityMiddleware.validate_rating(evaluation.rating)
   
   game = db.get(Game, evaluation.game_id)
   if not game:
       raise HTTPException(404, "Game not found")

   purchase_exists = db.query(db.query(Purchase).filter(Purchase.user_id == user.user_id, Purchase.game_id == evaluation.game_id).exists()).scalar()
   
   if not purchase_exists:
       raise HTTPException(403, "Game ownership required")

   existing_rating = db.query(Rating).filter(Rating.user_id == user.user_id, Rating.game_id == evaluation.game_id).first()

   if existing_rating:
       existing_rating.value = rating
   else:
       new_rating = Rating(user_id=user.user_id, game_id=evaluation.game_id, value=rating)
       db.add(new_rating)
       db.flush()

   # Recalcul moyenne
   ratings = [r.value for r in game.ratings]
   game.rating_avg = sum(ratings) / len(ratings)

   db.commit()
   
   return {"success": True, "message": f"Rating {'updated' if existing_rating else 'added'} successfully", "new_average": game.rating_avg}

# ================== ADMINISTRATION ==================

@router.post("/admin/ban/{user_id}")
async def ban_user_route(user_id: int, admin: User = Depends(get_validated_admin), db: Session = Depends(get_db)):
   """Bannir utilisateur (admin only)"""
   result = ban_user(db, admin_id=admin.user_id, user_id=user_id)
   if not result:
       raise HTTPException(403, "Ban failed")
   return {"success": True, "message": "User banned successfully"}

@router.post("/admin/unban/{user_id}")
async def unban_user_route(user_id: int, admin: User = Depends(get_validated_admin), db: Session = Depends(get_db)):
   """Débannir utilisateur (admin only)"""
   result = unban_user(db, admin_id=admin.user_id, user_id=user_id)
   if not result:
       raise HTTPException(403, "Unban failed")
   return {"success": True, "message": "User unbanned successfully"}

# ================== RESET PASSWORD ==================

@router.post("/forgot")
async def forgot_password(data: ForgotRequest, db: Session = Depends(get_db)):
   """
   Demande réinitialisation mot de passe
   - Génère code 6 chiffres valide 15min
   - Affiche en console (dev mode)
   """
   email = SecurityMiddleware.validate_email(data.email)
   user = db.query(User).filter(User.email == email).first()
   
   if not user:
       return JSONResponse({"message": "If email exists, code has been sent"})
   
   code = str(random.randint(100000, 999999))
   reset_codes[email] = {'code': code, 'expires': datetime.now() + timedelta(minutes=15)}
   
   print(f"\n🔥 RESET CODE FOR {email}: {code}\n")  # DEV: remplacer par email en prod
   
   return JSONResponse({"message": "If email exists, code has been sent"})

@router.post("/validate-code")
async def validate_reset_code(data: CodeValidation):
   """Validation code réinitialisation"""
   email = SecurityMiddleware.validate_email(data.email)
   
   if email not in reset_codes:
       raise HTTPException(400, "Invalid or expired code")
   
   code_data = reset_codes[email]
   
   if code_data['code'] != data.code or datetime.now() > code_data['expires']:
       del reset_codes[email]
       raise HTTPException(400, "Invalid or expired code")

   return {"message": "Code valid"}

@router.post("/reset-password")
async def reset_password(data: ResetRequest, db: Session = Depends(get_db)):
   """Réinitialisation effective mot de passe"""
   email = SecurityMiddleware.validate_email(data.email)
   password = SecurityMiddleware.validate_password(data.new_password)
   
   if email not in reset_codes:
       raise HTTPException(400, "Invalid reset session")
   
   user = db.query(User).filter(User.email == email).first()
   if not user:
       raise HTTPException(404, "User not found")

   user.hashed_password = hash_password(password)
   db.commit()
   
   del reset_codes[email]
   return {"message": "Password reset successful"}

# ================== WEBSOCKET & MESSAGES ==================

@router.websocket("/ws/game/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: int):
   """
   WebSocket pour chat temps réel par jeu
   - Heartbeat ping/pong
   - Broadcast messages à tous les connectés
   """
   await manager.connect(websocket, game_id)
   try:
       while True:
           data = await websocket.receive_text()
           if data == "ping":
               await websocket.send_text("pong")
   except WebSocketDisconnect:
       manager.disconnect(websocket, game_id)
   except Exception:
       manager.disconnect(websocket, game_id)

@router.post("/games/{game_id}/messages")
async def post_message_with_websocket(game_id: int, content: str = Form(...), db: Session = Depends(get_db), current_user: User = Depends(get_validated_user)):
   """
   Poster message dans chat jeu
   - Validation contenu (max 500 chars, anti-XSS)
   - Vérifie possession jeu
   - Broadcast WebSocket automatique
   """
   try:
       validated_content = ValidationMiddleware.validate_message_content(content)
       
       purchase = db.query(Purchase).filter(Purchase.user_id == current_user.user_id, Purchase.game_id == game_id).first()
       
       if not purchase:
           raise HTTPException(403, "Game ownership required to post messages")
       
       new_message = Message(user_id=current_user.user_id, game_id=game_id, content=validated_content, created_at=datetime.now(timezone.utc))
       
       db.add(new_message)
       db.commit()
       db.refresh(new_message)
       
       response_data = {"status": "success", "message": new_message.content, "username": current_user.username, "created_at": new_message.created_at.isoformat()}
       
       websocket_message = {"type": "new_message", "data": {"content": new_message.content, "user": {"username": current_user.username}, "created_at": new_message.created_at.isoformat()}}
       
       await manager.broadcast_to_game(game_id, websocket_message)
       return response_data
       
   except HTTPException:
       raise
   except Exception as e:
       db.rollback()
       raise HTTPException(500, f"Message failed to send: {str(e)}")

@router.get("/debug/websockets")
async def debug_websockets(admin: User = Depends(get_validated_admin)):
   """Debug: voir connexions WebSocket actives (admin only)"""
   return {"active_connections": {game_id: len(connections) for game_id, connections in manager.active_connections.items()}}