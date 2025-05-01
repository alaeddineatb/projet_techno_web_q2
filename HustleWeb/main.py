from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn
from views import router as views_router
from post import router as post_router
from pathlib import Path
from models import init_db
import os 


app = FastAPI(title="HustleWeb", 
             description="Plateforme de jeux vidéo", 
             version="1.0.0")


app.include_router(views_router)
app.include_router(post_router)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Chemin DIRECT vers Hustle/
STATIC_DIR = os.path.join(BASE_DIR, "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
print("[DEBUG] Chemin static :", STATIC_DIR)  
print("[DEBUG] Chemin static :", os.path.abspath("static/css/forgot.css"))
init_db()

if __name__ == "__main__":
    uvicorn.run("main:app", 
               host="0.0.0.0", 
               port=8000, 
               reload=True, 
               log_level="info")