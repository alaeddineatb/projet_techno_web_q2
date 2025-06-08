"""
Point d'entrée principal de l'application Game Store

Architecture:
- FastAPI comme framework web avec support async
- Organisation modulaire avec routers séparés (views/post)
- Middleware CORS pour développement
- Serveur de fichiers statiques (CSS/JS/images)
- Initialisation automatique de la base de données

Responsabilités:
- Configuration de l'application FastAPI
- Montage des routers et fichiers statiques
- Démarrage du serveur de développement avec Uvicorn
- Initialisation DB au lancement

Structure:
- views: Routes GET pour pages HTML
- post: Routes POST pour actions/API
- static: Ressources CSS, JS, images, photos profil
"""
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn
from views import router as views_router
from post import router as post_router
from initdb import init_db
import os 
from fastapi.middleware.cors import CORSMiddleware

# Configuration FastAPI
app = FastAPI(
   title="GamerZone",
   description="Plateforme de jeux vidéo", 
   version="1.0.0"
)

# CORS en mode développement (à sécuriser en production)
app.add_middleware(
   CORSMiddleware,
   allow_origins=["*"],
   allow_methods=["*"],
   allow_headers=["*"]
)

# Montage des routers modulaires
app.include_router(views_router)  # Pages HTML
app.include_router(post_router)   # Actions POST/API

# Serveur de fichiers statiques sur /static
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  
STATIC_DIR = os.path.join(BASE_DIR, "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Debug paths (à retirer en production)
print("[DEBUG] Chemin static :", STATIC_DIR)  
print("[DEBUG] Chemin static :", os.path.abspath("static/css/forgot.css"))

# Initialisation base de données (tables + données démo)
init_db()

# Démarrage serveur développement
if __name__ == "__main__":
   uvicorn.run(
       "main:app",
       host="0.0.0.0",
       port=8000,
       reload=True,
       log_level="info"
   )