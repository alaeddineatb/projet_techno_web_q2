import random
import bcrypt
from datetime import datetime
from sqlalchemy.orm import Session
from models import Base, User, Game, Purchase, Message,db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Configuration de la base de données
DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Fonction pour obtenir une session de base de données
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Hachage du mot de passe
def hashedpassword(password: str):
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt)

# Inscription
def register(db: Session, email: str, password: str) -> bool:
    # Vérifie si l'utilisateur existe déjà
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        return False
    
    # Génère un ID unique
    random_id = random.randrange(0, 100000000000)
    
    # Crée un nouvel utilisateur
    new_user = User(
        user_id=random_id,
        email=email,
        MotDePasse=hashedpassword(password),
        created_at=datetime.utcnow(),
        is_admin=False,  # Par défaut, l'utilisateur n'est pas admin
        is_banned=False,  # Par défaut, l'utilisateur n'est pas banni
        last_login=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    return True

# Connexion
def login_check(email: str, password: str) -> bool:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    
    # Vérifie si le mot de passe correspond
    if bcrypt.checkpw(password.encode('utf-8'), user.MotDePasse):
        user.last_login = datetime.utcnow()  # Met à jour la date de dernière connexion
        db.commit()
        return True
    return False

# Réinitialisation du mot de passe
def reset_password(email: str) -> bool:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    
  
    print(f"Code de réinitialisation envoyé à {email}")
    return True


def validate_code(emailuser: str, code: str):
  
    return code == "123456"  

# Ajout d'un jeu (admin seulement)
def add_game(user: str, title: str, price: float, description: str, publisher: str, category: str):
    etatuser = db.query(User).filter(User.user == user).first()

    
    if etatuser==None:
        return False

    randomgameid = random.randrange(0,1000000)
    # Crée un nouveau jeu
    new_game = Game(
        game_id=randomgameid,
        title=title,
        price=price,
        description=description,
        publisher=publisher,
        category=category,
        release_date=datetime.utcnow(),
        rating_avg=0.0)
    
    db.add(new_game)
    db.commit()
    return True

# Achat d'un jeu
def purchase_game(user_id: int, game_id: int):
    # Vérifie que l'utilisateur et le jeu existent
    user = db.query(User).filter(User.user_id == user_id).first()
    game = db.query(Game).filter(Game.game_id == game_id).first()
        
    if not user or not game:
            return False
    gameline = db.query(Game).filter(Game.game_id == game_id).first()
        
    randompurchaseid=random.randrange(0,1000000)

    new_purchase = Purchase(
        purchase_id=randompurchaseid,
        user_id=user_id,
        game_id=game_id,
        purchase_date=datetime.utcnow(),
        price=gameline.price,
        status="completed"  
    )
    
    db.add(new_purchase)
    db.commit()
    return True


def send_message(user_id: int, game_id: int, content: str) -> bool:
    user = db.query(User).filter(User.user_id == user_id).first()
    game = db.query(Game).filter(Game.game_id == game_id).first()
    
    if not user or not game:
        return False
    
    new_message = Message(
        user_msg=user_id,
        game_forum=game_id,
        content=content,
        created_at=datetime.utcnow()
    )
    
    db.add(new_message)
    db.commit()
    return True




def ban_user(admin_user: User, user_id: int):
   
    if not admin_user.is_admin:
        return False
    

    user_to_ban = db.query(User).filter(User.user_id == user_id).first()
    if not user_to_ban:
        return False 
    

    user_to_ban.is_banned = True
    db.commit()
    return True

# Débannir un utilisateur (admin seulement)
def unban_user(admin_user: User, user: int) -> bool:
  
    if not admin_user.is_admin:
        return False
    
    
    user_to_unban = db.query(User).filter(User.User== user).first()
    user_to_unbanstatus = db.query(User).filter(User.is_banned== True).first()
    if not (user_to_unban and user_to_unbanstatus):
        return False  
    user_to_unban.is_banned = False
    db.commit()
    return True





