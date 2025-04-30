import bcrypt
import random
from fastapi import HTTPException, Depends
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from models import User, Game, Purchase, Message, SessionLocal
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt 
from datetime import timedelta








# Fonctions utilitaires
def get_db():
    """Générateur de session de base de données"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()




SECRET_KEY = "cle_secrete_123!XYZ"  # Changez cette clé !
ALGORITHM = "HS256"
security = HTTPBearer()

def create_jwt(user_id: int) -> str:
    expires = datetime.utcnow() + timedelta(hours=24)
    payload = {"sub": str(user_id), "exp": expires}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")





def verify_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin required")
    return user




def hash_password(password: str) -> str:
    """Hash un mot de passe avec bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe hashé"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# Opérations CRUD pour les utilisateurs
def create_user(db: Session, username: str, email: str, password: str) -> Optional[User]:
    """Crée un nouvel utilisateur"""
    if db.query(User).filter((User.email == email) | (User.username == username)).first():
        return None
    
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        created_at=datetime.utcnow(),
        last_login=datetime.utcnow()
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authentifie un utilisateur"""
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    
    user.last_login = datetime.utcnow()
    db.commit()
    return user

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Récupère un utilisateur par son ID"""
    return db.query(User).filter(User.user_id == user_id).first()

# Opérations CRUD pour les jeux
def create_game(db: Session, title: str, description: str, price: float, 
               publisher: str, category: str, platforms: str) -> Game:
    game = Game(
    
        title=title,
        description=description,
        price=price,
        publisher=publisher,
        category=category,
        platforms=platforms,
        release_date=datetime.utcnow()
    )
    
    db.add(game)
    db.commit()
    db.refresh(game)
    return game

def get_game_by_id(db: Session, game_id: int) -> Optional[Game]:
    """Récupère un jeu par son ID"""
    return db.query(Game).filter(Game.game_id == game_id).first()

def get_all_games(db: Session, skip: int = 0, limit: int = 100) -> List[Game]:
    """Récupère tous les jeux avec pagination"""
    return db.query(Game).offset(skip).limit(limit).all()

# Opérations CRUD pour les achats
def create_purchase(db: Session, user_id: int, game_id: int) -> Optional[Purchase]:
    """Crée un nouvel achat"""
    user = db.query(User).filter(User.user_id == user_id, User.is_banned == False).first()
    game = db.query(Game).filter(Game.game_id == game_id).first()
    
    if not user or not game:
        return None
    
    # Vérifie si l'utilisateur a déjà acheté le jeu
    if db.query(Purchase).filter(Purchase.user_id == user_id, Purchase.game_id == game_id).first():
        return None
    
    purchase = Purchase(
        purchase_id=random.randint(1, 10**9),
        user_id=user_id,
        game_id=game_id,
        price=game.price,
        purchase_date=datetime.utcnow()
    )
    
    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    return purchase

def get_user_purchases(db: Session, user_id: int) -> List[Purchase]:
    """Récupère les achats d'un utilisateur"""
    return db.query(Purchase).filter(Purchase.user_id == user_id).all()

# Opérations CRUD pour les messages
def create_message(db: Session, user_id: int, game_id: int, content: str) -> Optional[Message]:
    """Crée un nouveau message"""
    # Vérifie si l'utilisateur a acheté le jeu
    if not db.query(Purchase).filter(Purchase.user_id == user_id, Purchase.game_id == game_id).first():
        return None
    
    message = Message(
        message_id=random.randint(1, 10**9),
        user_id=user_id,
        game_id=game_id,
        content=content,
        created_at=datetime.utcnow()
    )
    
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

def get_game_messages(db: Session, game_id: int) -> List[Message]:
    """Récupère les messages d'un jeu"""
    return db.query(Message).filter(Message.game_id == game_id).order_by(Message.created_at).all()

# Opérations d'administration
def ban_user(db: Session, admin_id: int, user_id: int) -> bool:
    """Bannit un utilisateur"""
    admin = db.query(User).filter(User.user_id == admin_id, User.is_admin == True).first()
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not admin or not user or user.is_admin:
        return False
    
    user.is_banned = True
    db.commit()
    return True

def unban_user(db: Session, admin_id: int, user_id: int) -> bool:
    """Débannit un utilisateur"""
    admin = db.query(User).filter(User.user_id == admin_id, User.is_admin == True).first()
    user = db.query(User).filter(User.user_id == user_id, User.is_banned == True).first()
    
    if not admin or not user:
        return False
    
    user.is_banned = False
    db.commit()
    return True