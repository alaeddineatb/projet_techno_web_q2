import bcrypt
import random
from fastapi import HTTPException, Depends
from datetime import datetime,timezone
from typing import Optional, List
from sqlalchemy.orm import Session
from models import User, Game, Purchase, Message, SessionLocal
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt 
from datetime import timedelta
from fastapi import Depends, HTTPException, status, Cookie
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer









def get_db():
    """Générateur de session de base de données"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()




SECRET_KEY = "keydecon145"  
ALGORITHM = "HS256"
security = HTTPBearer()

def create_jwt(user_id: int) -> str:
    expires = datetime.utcnow() + timedelta(hours=24)
    payload = {"sub": str(user_id), "exp": expires}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)




def initialize_sample_games(db: Session):
    sample_games = [
        {
        "game_id": 1,
        "title": "Cyber Odyssey",
        "description": "Un RPG d'action futuriste avec une histoire immersive",
        "price": 59.99,
        "release_date": "2025-03-15T00:00:00Z",
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
       "release_date": "2024-11-20T00:00:00Z",
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
        "release_date": "2025-01-10T00:00:00Z",
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
        "release_date": "2024-09-05T00:00:00Z",
        "publisher": "Fantasy Studios",
        "category": "RPG",
        "rating_avg": 4.9,
        "platforms": "PC",
        "image": "#333"
    }
    ]

    for game in sample_games:
        if not db.query(Game).filter(Game.title == game["title"]).first():
            new_game = Game(**game)
            db.add(new_game)
    db.commit()






def get_current_user(
    token: str = Cookie(default=None, alias="token"),  
    db: Session = Depends(get_db)
) -> User:
    print(f"🔑 Token reçu: {token}")  
    
    if not token:
        print("❌ Aucun token trouvé dans les cookies")
        raise HTTPException(401, "Not authenticated")
    
    try:
        # Décodage JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"📄 Payload décodé: {payload}")  # Debug 2
        
        # Extraction user_id
        user_id = payload.get("sub")
        if not user_id:
            print("❌ 'sub' manquant dans le payload")
            raise HTTPException(401, "Invalid token")
        
        print(f"🔍 User ID extrait: {user_id} (type: {type(user_id)})")  # Debug 3
        
        # Conversion en int
        try:
            user_id_int = int(user_id)
        except ValueError:
            print(f"❌ Impossible de convertir user_id en int: {user_id}")
            raise HTTPException(401, "Invalid user ID format")
        
        # Recherche utilisateur
        user = db.query(User).filter(User.user_id == user_id_int).first()
        if not user:
            print(f"❌ Utilisateur introuvable en BDD: ID {user_id_int}")
            raise HTTPException(401, "User not found")
        
        print(f"✅ Utilisateur trouvé: {user.username}")  # Debug 4
        return user
    
    except JWTError as e:
        print(f"💥 Erreur JWT: {str(e)}")  # Debug 5
        raise HTTPException(401, "Invalid token")
    except Exception as e:
        print(f"💥 Erreur inattendue: {str(e)}")  # Debug 6
        raise HTTPException(500, "Internal server error")



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


def create_user(db: Session, username: str, email: str, password: str) -> Optional[User]:
    """Crée un nouvel utilisateur"""
    if db.query(User).filter((User.email == email) | (User.username == username)).first():
        return None
    
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        created_at=datetime.now(timezone.utc),
        last_login=datetime.now(timezone.utc)
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    print(user)
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


def create_purchase(db: Session, user_id: int, game_id: int, price: float):
    """Crée un achat en base de données"""
    print(f"\n[DEBUG] Création achat - user: {user_id}, game: {game_id}, price: {price}")
    try:
        new_purchase = Purchase(
            user_id=user_id,
            game_id=game_id,
            price=price,
        )
        
        db.add(new_purchase)
        db.commit()
        db.refresh(new_purchase)
        print(f"[DEBUG] Achat enregistré - ID: {new_purchase.purchase_id}")
        return new_purchase

    except Exception as e:
        db.rollback()
        print(f"[DEBUG] ERREUR création achat: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Erreur création achat: {str(e)}"
        )

def get_user_purchases(db: Session, user_id: int) -> List[Purchase]:
    """Récupère les achats d'un utilisateur"""
    return db.query(Purchase).filter(Purchase.user_id == user_id).all()

def create_message(db: Session, user_id: int, game_id: int, content: str) -> Message:
    """Crée un message avec vérification d'achat"""
    # Vérifie si l'utilisateur possède le jeu
    purchase = db.query(Purchase).join(Game).filter(
        Purchase.user_id == user_id,
        Purchase.game_id == game_id
    ).first()

    if not purchase:
        raise HTTPException(
            status_code=403,
            detail="Vous devez acheter le jeu pour poster des messages"
        )

    try:
        new_message = Message(
            user_id=user_id,
            game_id=game_id,
            content=content
        )
        db.add(new_message)
        db.commit()
        db.refresh(new_message)
        return new_message

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur serveur: {str(e)}"
        )

def get_game_messages(db: Session, game_id: int) -> List[Message]:
    """Récupère les messages d'un jeu"""
    return db.query(Message).filter(Message.game_id == game_id).order_by(Message.created_at).all()


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