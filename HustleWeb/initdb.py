
from models import Base, engine
from databaseinit import initialize_sample_games
from sqlalchemy.orm import Session

def init_db():
    """Initialise la BDD et ajoute des données de test"""
    Base.metadata.create_all(bind=engine)
    
    # Ajoutez les jeux
    with Session(engine) as session:
        initialize_sample_games(session)
        print("✅ Jeux initiaux créés avec succès")

if __name__ == "__main__":
    init_db()