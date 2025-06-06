from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import uvicorn
from views import router as views_router
from post import router as post_router
from pathlib import Path
from initdb import init_db
import os 
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="HustleWeb", 
             description="Plateforme de jeux vidéo", 
             version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(views_router)
app.include_router(post_router)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  
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