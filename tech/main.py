from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, UploadFile, Form, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
import os
import shutil
from datetime import datetime
import uvicorn
from models import SessionLocal
from websocket import manager
import backend
from views import router as views_router
from post import router as post_router
from pathlib import Path
from initdb import init_db
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="HustleWeb", 
             description="Plateforme de jeux vidéo", 
             version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # À adapter en production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(views_router)
app.include_router(post_router)
BASE_DIR = Path(__file__).parent.absolute()
STATIC_DIR = BASE_DIR / "static"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
print("[DEBUG] Chemin static :", STATIC_DIR)
print("[DEBUG] Chemin static :", (STATIC_DIR / "css/forgot.css").absolute())
templates = Jinja2Templates(directory="templates")

# Créer le dossier pour les images de jeux s'il n'existe pas
UPLOAD_DIR = STATIC_DIR / "game_images"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.websocket("/ws/game/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: int, db: Session = Depends(get_db)):
    await manager.connect(websocket, game_id)
    try:
        while True:
            data = await websocket.receive_json()
            user = backend.get_current_user(websocket.cookies.get("token"), db)
            
            if not user:
                await websocket.close()
                return

            message = backend.create_message(db, user.user_id, game_id, data["content"])
            
            await manager.broadcast_message({
                "username": user.username,
                "content": data["content"],
                "created_at": message.created_at.isoformat()
            }, game_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, game_id)
        await manager.broadcast_message({
            "system": True,
            "content": "Un utilisateur s'est déconnecté"
        }, game_id)

@app.post("/upload_game_image/{game_id}")
async def upload_game_image(
    game_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Vérifier l'extension du fichier
    valid_extensions = {".jpg", ".jpeg", ".png", ".gif"}
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in valid_extensions:
        return {"error": "Format de fichier non supporté"}

    # Créer un nom de fichier unique
    filename = f"game_{game_id}{file_ext}"
    file_path = UPLOAD_DIR / filename

    # Sauvegarder le fichier
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        return {"error": f"Erreur lors de la sauvegarde du fichier: {str(e)}"}

    # Mettre à jour le chemin de l'image dans la base de données
    game = backend.get_game_by_id(db, game_id)
    if game:
        game.image = f"/static/game_images/{filename}"
        db.commit()
        return {"success": True, "image_path": game.image}
    
    return {"error": "Jeu non trouvé"}

init_db()

if __name__ == "__main__":
    uvicorn.run("main:app", 
               host="0.0.0.0", 
               port=8000, 
               reload=True, 
               log_level="info")