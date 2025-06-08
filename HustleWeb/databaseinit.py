"""
Initialisation des données de démonstration pour Game Store

Responsabilités:
- Insère 4 jeux exemples dans la base de données
- Fonction idempotente (évite les doublons)
- Données réalistes pour tests et développement

Jeux créés:
- Cyber Odyssey (RPG futuriste, 59.99€)
- Galaxy Commander (Stratégie spatiale, 49.99€)
- Speed Demons (Course de rue, 39.99€)
- Mystic Lands (MMORPG fantastique, 29.99€)
"""
from models import Game
from sqlalchemy.orm import Session
from datetime import datetime

def initialize_sample_games(db: Session):
   """
   Insère des jeux de démonstration dans la base
   - Vérification d'unicité par titre
   - Commit unique pour toutes les insertions
   - Images en placeholder à remplacer
   """
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
           "image": "#333" 
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
           "image": "#333"
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
           "image": "#333"
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
           "image": "#333"
       }
   ]

   # Insertion avec vérification d'unicité
   for game in sample_games:
       if not db.query(Game).filter(Game.title == game["title"]).first():
           new_game = Game(**game)
           db.add(new_game)
   
   db.commit()