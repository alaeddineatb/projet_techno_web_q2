from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn
from views import router as views_router
from post import router as post_router
from pathlib import Path


# Création de l'application
app = FastAPI(title="HustleWeb", 
             description="Plateforme de jeux vidéo", 
             version="1.0.0")

# Montage des routeurs
app.include_router(views_router)
app.include_router(post_router)

# Configuration des fichiers statiques
app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

if __name__ == "__main__":
    uvicorn.run("main:app", 
               host="0.0.0.0", 
               port=8000, 
               reload=True,  # Activation du rechargement automatique en développement
               log_level="info")