import os
import shutil
from models import Base, engine, Game, SessionLocal
from sqlalchemy.orm import Session
from datetime import datetime, timezone

def initialize_sample_games(db: Session):
    """Initialise les jeux de démonstration"""
    sample_games = [
        {
            "game_id": 1,
            "title": "Cyber Odyssey",
            "description": "Un RPG d'action futuriste avec une histoire immersive",
            "price": 59.99,
            "release_date": datetime.strptime("2025-03-15T00:00:00Z", "%Y-%m-%dT%H:%M:%SZ"),
            "publisher": "Neon Games",
            "category": "RPG",
            "rating_avg": 4.8,
            "platforms": "PC,PlayStation,Xbox",
            "image": "/static/game_images/cyber_odyssey.jpg"
        },
        {
            "game_id": 2,
            "title": "Galaxy Commander",
            "description": "Stratégie spatiale avec gestion de ressources complexes",
            "price": 49.99,
            "release_date": datetime.strptime("2024-11-20T00:00:00Z", "%Y-%m-%dT%H:%M:%SZ"),
            "publisher": "StrategySoft",
            "category": "Strategy",
            "rating_avg": 4.5,
            "platforms": "PC,Mobile",
            "image": "/static/game_images/galaxy_commander.jpg"
        },
        {
            "game_id": 3,
            "title": "Speed Demons",
            "description": "Course de rue avec personnalisation poussée des véhicules",
            "price": 39.99,
            "release_date": datetime.strptime("2025-01-10T00:00:00Z", "%Y-%m-%dT%H:%M:%SZ"),
            "publisher": "Racing Entertainment",
            "category": "Racing",
            "rating_avg": 4.7,
            "platforms": "PlayStation,Xbox,PC",
            "image": "/static/game_images/speed_demons.jpg"
        },
        {
            "game_id": 4,
            "title": "Mystic Lands",
            "description": "MMORPG fantastique avec monde ouvert gigantesque",
            "price": 29.99,
            "release_date": datetime.strptime("2024-09-05T00:00:00Z", "%Y-%m-%dT%H:%M:%SZ"),
            "publisher": "Fantasy Studios",
            "category": "RPG",
            "rating_avg": 4.9,
            "platforms": "PC",
            "image": "/static/game_images/mystic_lands.jpg"
        },
        {
            "game_id": 5,
            "title": "Dragon's Quest",
            "description": "Une aventure épique dans un monde de dragons",
            "price": 44.99,
            "release_date": datetime.strptime("2024-12-25T00:00:00Z", "%Y-%m-%dT%H:%M:%SZ"),
            "publisher": "Fantasy Games",
            "category": "RPG",
            "rating_avg": 4.6,
            "platforms": "PC,PlayStation,Xbox",
            "image": "/static/game_images/dragons_quest.jpg"
        },
        {
            "game_id": 6,
            "title": "Night Raiders",
            "description": "Action furtive dans un monde cyberpunk",
            "price": 34.99,
            "release_date": datetime.strptime("2025-02-14T00:00:00Z", "%Y-%m-%dT%H:%M:%SZ"),
            "publisher": "Stealth Games",
            "category": "Action",
            "rating_avg": 4.4,
            "platforms": "PC,PlayStation",
            "image": "/static/game_images/night_raiders.jpg"
        },
        {
            "game_id": 7,
            "title": "Tactical Force",
            "description": "Jeu de stratégie militaire tactique",
            "price": 39.99,
            "release_date": datetime.strptime("2024-10-01T00:00:00Z", "%Y-%m-%dT%H:%M:%SZ"),
            "publisher": "War Games Inc",
            "category": "Strategy",
            "rating_avg": 4.3,
            "platforms": "PC",
            "image": "/static/game_images/tactical_force.jpg"
        },
        {
            "game_id": 8,
            "title": "Medieval Kingdom",
            "description": "Gestion de royaume médiéval",
            "price": 29.99,
            "release_date": datetime.strptime("2024-08-30T00:00:00Z", "%Y-%m-%dT%H:%M:%SZ"),
            "publisher": "Kingdom Games",
            "category": "Strategy",
            "rating_avg": 4.2,
            "platforms": "PC,Mobile",
            "image": "/static/game_images/medieval_kingdom.jpg"
        }
    ]

    for game in sample_games:
        if not db.query(Game).filter(Game.title == game["title"]).first():
            new_game = Game(**game)
            db.add(new_game)
    db.commit()

def init_db():
    """Initialise la base de données et configure les images"""
    # Créer les tables
    Base.metadata.create_all(bind=engine)
    
    # Créer le dossier des images de jeux s'il n'existe pas
    UPLOAD_DIR = "static/game_images"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Initialiser la base de données avec les jeux de démonstration
    db = SessionLocal()
    try:
        initialize_sample_games(db)
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    print("✅ Base de données initialisée avec succès")