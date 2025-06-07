from fastapi import FastAPI, Request, Form, HTTPException, APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import random
import datetime
from fastapi import Body
import os
from datetime import timedelta, timezone,datetime
from fastapi.responses import JSONResponse
from fastapi import File, UploadFile
from backend import create_jwt, hash_password
from backend import (
    get_db, create_user, authenticate_user, 
    create_game, create_purchase, create_message,
    ban_user,get_current_user,verify_admin
)
from models import User,Game,Purchase,Rating
from pathlib import Path
import pathlib
from pydantic import BaseModel
import resend
from typing import Dict, List
import json

class RatingRequest(BaseModel):
    game_id: int
    rating: int

class ForgotRequest(BaseModel):
    email: str

class CodeValidation(BaseModel):
    email: str
    code: str

class ResetRequest(BaseModel):
    email: str
    new_password: str

# Gestionnaire de connexions WebSocket
class ConnectionManager:
    def __init__(self):
        # Dict[game_id, List[WebSocket]]
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, game_id: int):
        await websocket.accept()
        if game_id not in self.active_connections:
            self.active_connections[game_id] = []
        self.active_connections[game_id].append(websocket)
        print(f"Nouvelle connexion WebSocket pour le jeu {game_id}")

    def disconnect(self, websocket: WebSocket, game_id: int):
        if game_id in self.active_connections:
            if websocket in self.active_connections[game_id]:
                self.active_connections[game_id].remove(websocket)
                print(f"Connexion fermée pour le jeu {game_id}")
            # Nettoyer si plus de connexions
            if not self.active_connections[game_id]:
                del self.active_connections[game_id]

    async def broadcast_to_game(self, game_id: int, message: dict):
        """Diffuse un message à tous les clients connectés pour un jeu spécifique"""
        if game_id not in self.active_connections:
            print(f"Aucune connexion active pour le jeu {game_id}")
            return
        
        print(f"Diffusion vers {len(self.active_connections[game_id])} connexions pour le jeu {game_id}")
        
        # Copie de la liste pour éviter les modifications concurrentes
        connections = self.active_connections[game_id].copy()
        disconnected = []
        
        for connection in connections:
            try:
                await connection.send_text(json.dumps(message))
                print(f"Message envoyé via WebSocket: {message}")
            except Exception as e:
                print(f"Erreur envoi WebSocket: {e}")
                # Connexion fermée, la marquer pour suppression
                disconnected.append(connection)
        
        # Nettoyer les connexions mortes
        for conn in disconnected:
            self.disconnect(conn, game_id)

# Instance globale
manager = ConnectionManager()

router = APIRouter()
templates_path = pathlib.Path(__file__).parent/ "templates"
templates = Jinja2Templates(directory=templates_path)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Chemin du fichier actuel (main.py)
STATIC_DIR = os.path.join(BASE_DIR, "static")  # Doit pointer vers c:\...\Hustle\static

router.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

reset_codes = {}  

resend.api_key = os.getenv("RESEND_API_KEY") 

@router.post("/signup")
async def register_user(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        print("Data received:", username, email) 
        user = create_user(db, username=username, email=email, password=password)
        print("User created:", user) 
        if not user:
            return templates.TemplateResponse(
                "auth/signup.html",
                {"request": request, "error": "Username or email already exists"},
                status_code=400
            )
        return RedirectResponse(url="/login", status_code=303)
    except Exception as e:
        print(f"Error: {str(e)}")  
        raise

@router.post("/login")
async def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
 user = authenticate_user(db, username=username, password=password)
 if not user:
        return JSONResponse(
            status_code=401,
            content={"success": False, "error": "Invalid credentials"}
        )
    
 token = create_jwt(user.user_id)
 response = JSONResponse({"success": True})
    
 response.set_cookie(
    key="token",
    value=token,
    httponly=True,
    samesite="Lax", 
    secure=False,     
    path="/",        #Le cookie est envoyé pour toutes les routes
    max_age=86400     
 )
    
 return response

@router.post("/profile/update")
async def update_profile(
    photo: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        BASE_DIR = os.path.dirname(os.path.abspath(__file__)) 
        PHOTOS_DIR = os.path.join(BASE_DIR, "static", "photos")
        os.makedirs(PHOTOS_DIR, exist_ok=True)

        filename = f"{user.user_id}.jpg"
        filepath = os.path.join(PHOTOS_DIR, filename)

        with open(filepath, "wb") as f:
            contents = await photo.read()
            f.write(contents)

        user.photo_url = f"/static/photos/{filename}"
        db.commit()
        db.refresh(user) 

        return {"photo_url": user.photo_url}

    except Exception as e:
        db.rollback()
        print(f"ERREUR : {str(e)}")
        raise HTTPException(status_code=500, detail="Échec de la mise à jour")
    
@router.post("/games/add")
async def add_new_game(
    request: Request,
    title: str = Form(...),
    price: float = Form(...),
    description: str = Form(...),
    publisher: str = Form(...),
    category: str = Form(...),
    platforms: str = Form(...),
    db: Session = Depends(get_db)
):
    # TODO: Vérifier que l'utilisateur est admin
    game = create_game(
        db,
        title=title,
        description=description,
        price=price,
        publisher=publisher,
        category=category,
        platforms=platforms
    )
    if not game:
        raise HTTPException(status_code=400, detail="Could not create game")

    return RedirectResponse(url="/games", status_code=303)

@router.post("/purchase/{game_id}")
async def purchase_game(
    game_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(404, "Jeu introuvable")
    
    existing_purchase = db.query(Purchase).filter(
        Purchase.user_id == current_user.user_id,
        Purchase.game_id == game_id
    ).first()
    
    if existing_purchase:
        raise HTTPException(
            status_code=400,
            detail="Vous avez déjà acheté ce jeu"
        )

    try:
        new_purchase = Purchase(
            user_id=current_user.user_id,
            game_id=game_id,
            price=game.price,
            purchase_date=datetime.now(timezone.utc)
        )
        db.add(new_purchase)
        db.commit()
        return {"status": "success"}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Erreur serveur: {str(e)}"}
        )

#Route admin pour bannir un utilisateur (vérification admin ajoutée)
@router.post("/admin/ban/{user_id}")
async def ban_user_route(
    user_id: int,
    admin: User = Depends(verify_admin),  #Vérification automatique
    db: Session = Depends(get_db)
):
    result = ban_user(db, admin_id=admin.user_id, user_id=user_id)
    if not result:
        raise HTTPException(status_code=403, detail="Not authorized")

    return RedirectResponse(url="/admin", status_code=303)

@router.post("/forgot")
async def forgot_password(data: ForgotRequest, db: Session = Depends(get_db)):
    email = data.email
    
    # 1. Vérifie si l'email existe
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return JSONResponse({"message": "Si l'email existe, un code a été envoyé"})  # Même message
    
    # 2. Génère et affiche le code dans le terminal
    code = str(random.randint(100000, 999999))  # 6 chiffres
    reset_codes[email] = code
    print(f"\n🔥 CODE POUR {email} : {code}\n")  # Gros message visible
    
    return JSONResponse({"message": "Si l'email existe, un code a été envoyé"})

#Route pour valider le code et réinitialiser le mot de passe
@router.post("/validate-code")
async def validate_reset_code(
    data: CodeValidation
):
    if data.email not in reset_codes or reset_codes[data.email] != data.code:
        raise HTTPException(status_code=400, detail="Invalid code")

    return {"message": "Code valid"}

@router.post("/reset-password")
async def reset_password(
    data: ResetRequest,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(data.new_password)  
    db.commit()

    return {"message": "Password reset successful"}

@router.post("/games/rate")
async def noter_jeu(
    evaluation: RatingRequest,
    db: Session = Depends(get_db),
    utilisateur: User = Depends(get_current_user)
):

    jeu = db.get(Game, evaluation.game_id)
    if not jeu:
        raise HTTPException(404, "Jeu introuvable")

    achat_existe = db.query(
        db.query(Purchase).filter(
            Purchase.user_id == utilisateur.user_id,
            Purchase.game_id == evaluation.game_id
        ).exists()
    ).scalar()
    
    if not achat_existe:
        raise HTTPException(403, "Achat requis pour noter ce jeu")

    evaluation_existante = db.query(Rating).filter(
        Rating.user_id == utilisateur.user_id,
        Rating.game_id == evaluation.game_id
    ).first()

    if evaluation_existante:
        evaluation_existante.value = evaluation.rating
        action = "mise à jour"
    else:
        nouvelle_evaluation = Rating(
            user_id=utilisateur.user_id,
            game_id=evaluation.game_id,
            value=evaluation.rating
        )
        db.add(nouvelle_evaluation)
        action = "ajoutée"

    # Calcul dynamique de la nouvelle moyenne
    notes = [r.value for r in jeu.ratings]
    if not evaluation_existante and not notes:
        notes.append(evaluation.rating)
    jeu.rating_avg = sum(notes) / len(notes)

    db.commit()
    
    return {
        "success": True,
        "message": f"Note {action} avec succès",
        "nouvelle_moyenne": jeu.rating_avg
    }

# Route WebSocket
@router.websocket("/ws/game/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: int):
    await manager.connect(websocket, game_id)
    try:
        while True:
            # Recevoir les messages pour maintenir la connexion ouverte
            try:
                # Timeout pour éviter de bloquer indéfiniment
                data = await websocket.receive_text()
                # Optionnel: traiter les pings/pongs du client
                if data == "ping":
                    await websocket.send_text("pong")
            except Exception as e:
                # Si erreur de réception, sortir de la boucle
                print(f"Erreur réception WebSocket: {e}")
                break
    except WebSocketDisconnect:
        print(f"WebSocket déconnecté pour le jeu {game_id}")
        manager.disconnect(websocket, game_id)
    except Exception as e:
        print(f"Erreur WebSocket générale: {e}")
        manager.disconnect(websocket, game_id)

# Route pour envoyer les messages via WebSocket
@router.post("/games/{game_id}/messages")
async def post_message_with_websocket(
    game_id: int,
    content: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        message = create_message(
            db=db,
            user_id=current_user.user_id,
            game_id=game_id,
            content=content
        )
        
        # Données de réponse
        response_data = {
            "status": "success",
            "message": message.content,
            "username": current_user.username,
            "created_at": message.created_at.isoformat()
        }
        
        # Diffuser le nouveau message via WebSocket à tous les clients connectés
        websocket_message = {
            "type": "new_message",
            "data": {
                "content": message.content,
                "user": {"username": current_user.username},
                "created_at": message.created_at.isoformat()
            }
        }
        
        # Diffusion asynchrone
        print(f"Tentative de diffusion WebSocket pour le jeu {game_id}")
        await manager.broadcast_to_game(game_id, websocket_message)
        
        return response_data
        
    except Exception as e:
        print(f"Erreur dans post_message: {e}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Erreur serveur: {str(e)}"}
        )

# Route de debug pour voir les connexions actives
@router.get("/debug/websockets")
async def debug_websockets():
    return {
        "active_connections": {
            game_id: len(connections) 
            for game_id, connections in manager.active_connections.items()
        }
    }