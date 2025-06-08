"""
Initialise la base de données avec tables et données de démo
"""
from models import Base, engine
from databaseinit import initialize_sample_games
from sqlalchemy.orm import Session

def init_db():
    """
    Crée les tables et insère les jeux de démonstration
    - create_all() : crée les tables si elles n'existent pas
    - initialize_sample_games() : ajoute 4 jeux exemples
    """
    # Création des tables
    Base.metadata.create_all(bind=engine)
    
    # Insertion des données de démo
    with Session(engine) as session:
        initialize_sample_games(session)
        print("✅ Jeux initiaux créés avec succès")

if __name__ == "__main__":
    init_db()