import os
import shutil
from models import Base, engine, Game, SessionLocal
from databaseinit import initialize_sample_games
from sqlalchemy.orm import Session
from datetime import datetime, timezone

def init_db():
    """Initialise la BDD et ajoute des données de test"""
    Base.metadata.create_all(bind=engine)
    
    # Créer le dossier des images de jeux s'il n'existe pas
    UPLOAD_DIR = "static/game_images"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Copier les images par défaut
    DEFAULT_IMAGES = {
        "Cyber Odyssey": "cyber_odyssey.jpg",
        "Galaxy Commander": "galaxy_commander.jpg",
        "Speed Demons": "speed_demons.jpg",
        "Mystic Lands": "mystic_lands.jpg"
    }
    
    # Créer le dossier des images par défaut s'il n'existe pas
    DEFAULT_IMAGES_DIR = "static/default_game_images"
    os.makedirs(DEFAULT_IMAGES_DIR, exist_ok=True)
    
    db = SessionLocal()
    try:
        # Pour chaque jeu dans la base de données
        games = db.query(Game).all()
        for game in games:
            if game.title in DEFAULT_IMAGES:
                # Chemin de l'image par défaut
                default_image = os.path.join(DEFAULT_IMAGES_DIR, DEFAULT_IMAGES[game.title])
                
                # Créer une image par défaut si elle n'existe pas
                if not os.path.exists(default_image):
                    with open(default_image, 'w') as f:
                        f.write("Placeholder for game image")
                
                # Copier l'image dans le dossier des images de jeux
                target_image = os.path.join(UPLOAD_DIR, DEFAULT_IMAGES[game.title])
                if not os.path.exists(target_image):
                    shutil.copy2(default_image, target_image)
                
                # Mettre à jour le chemin de l'image dans la base de données
                game.image = f"/static/game_images/{DEFAULT_IMAGES[game.title]}"
        
        db.commit()
    
    finally:
        db.close()

if __name__ == "__main__":
    init_db()