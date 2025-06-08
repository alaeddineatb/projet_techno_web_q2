"""
Backend Game Store - Gestion utilisateurs, jeux et authentification

Architecture backend:
- JWT pour authentification stateless avec cookies httpOnly
- Bcrypt pour hash sécurisé des mots de passe
- SQLAlchemy ORM avec pattern Repository
- Système d'autorisation par rôles (admin/user)

Responsabilités:
- Authentification/autorisation (JWT + cookies)
- CRUD utilisateurs avec permissions
- Gestion catalogue jeux et achats
- Système de messages par jeu
- Administration (ban/unban utilisateurs)

Sécurité:
- Mots de passe hashés avec salt unique
- Tokens JWT avec expiration 24h
- Vérification propriété pour messages
- Protection contre injections SQL via ORM
"""
import bcrypt
from fastapi import HTTPException, Depends, Cookie
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from models import User, Game, Purchase, Message, SessionLocal
from jose import JWTError, jwt

# Configuration JWT (à sécuriser en production)
SECRET_KEY = "keydecon145"  # TODO: Variable environnement
ALGORITHM = "HS256"
ListeAdmin = ["Mathias", "Alae", "Youssef", "Ziad"]  # TODO: Système rôles en DB

def get_db():
   """
   Générateur de session SQLAlchemy pour injection de dépendances
   - Session par requête avec fermeture automatique
   - Thread-safe et rollback automatique si exception
   """
   db = SessionLocal()
   try:
       yield db
   finally:
       db.close()

def create_jwt(user_id: int) -> str:
   """
   Crée un token JWT pour authentification
   - Expiration 24h pour sécurité
   - Payload minimal (user_id + expiration)
   """
   expires = datetime.now(timezone.utc) + timedelta(hours=24)
   payload = {"sub": str(user_id), "exp": expires}
   return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Cookie(default=None, alias="token"), db: Session = Depends(get_db)) -> User:
   """
   Récupère l'utilisateur authentifié depuis le token JWT cookie
   - Décode JWT et valide signature + expiration
   - Charge utilisateur frais depuis DB
   - Raise 401 si pas de token ou token invalide
   """
   if not token:
       raise HTTPException(401, "Not authenticated")
   
   try:
       payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
       user_id = payload.get("sub")
       if not user_id:
           raise HTTPException(401, "Invalid token")
       
       user_id_int = int(user_id)
       user = db.query(User).filter(User.user_id == user_id_int).first()
       if not user:
           raise HTTPException(401, "User not found")
       
       return user
   
   except JWTError:
       raise HTTPException(401, "Invalid token")
   except Exception:
       raise HTTPException(500, "Internal server error")

def verify_admin(user: User = Depends(get_current_user)) -> User:
   """
   Vérifie que l'utilisateur a les droits administrateur
   - Utilise get_current_user puis vérifie flag is_admin
   - Raise 403 si pas admin
   """
   if not user.is_admin:
       raise HTTPException(status_code=403, detail="Admin required")
   return user

# ================== GESTION MOTS DE PASSE ==================

def hash_password(password: str) -> str:
   """Hash un mot de passe avec bcrypt et salt unique"""
   return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
   """Vérifie un mot de passe contre son hash (timing-safe)"""
   return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# ================== GESTION UTILISATEURS ==================

def create_user(db: Session, username: str, email: str, password: str) -> Optional[User]:
   """
   Crée un nouvel utilisateur avec vérification d'unicité
   - Vérifie unicité username ET email
   - Détermine si admin selon liste hardcodée
   - Hash le mot de passe avant stockage
   """
   if db.query(User).filter((User.email == email) | (User.username == username)).first():
       return None
   
   user = User(
       username=username,
       email=email,
       hashed_password=hash_password(password),
       created_at=datetime.now(timezone.utc),
       last_login=datetime.now(timezone.utc),
       is_admin=(username in ListeAdmin)
   )
   
   db.add(user)
   db.commit()
   db.refresh(user)
   return user

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
   """
   Authentifie un utilisateur et met à jour last_login
   - Vérification timing-safe du password
   - Mise à jour last_login si succès
   """
   user = db.query(User).filter(User.username == username).first()
   
   if not user or not verify_password(password, user.hashed_password):
       return None
   
   user.last_login = datetime.now(timezone.utc)
   db.commit()
   return user

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
   """Récupère un utilisateur par son ID"""
   return db.query(User).filter(User.user_id == user_id).first()

# ================== GESTION CATALOGUE JEUX ==================

def create_game(db: Session, title: str, description: str, price: float, publisher: str, category: str, platforms: str) -> Game:
   """
   Crée un nouveau jeu dans le catalogue
   - Release date = date d'ajout au catalogue
   """
   game = Game(
       title=title, description=description, price=price,
       publisher=publisher, category=category, platforms=platforms,
       release_date=datetime.now(timezone.utc)
   )
   
   db.add(game)
   db.commit()
   db.refresh(game)
   return game

def get_game_by_id(db: Session, game_id: int) -> Optional[Game]:
   """Récupère un jeu par son ID"""
   return db.query(Game).filter(Game.game_id == game_id).first()

def get_all_games(db: Session, skip: int = 0, limit: int = 100) -> List[Game]:
   """Liste paginée de tous les jeux (max 100 par défaut)"""
   return db.query(Game).offset(skip).limit(limit).all()

# ================== GESTION ACHATS ==================

def create_purchase(db: Session, user_id: int, game_id: int, price: float):
   """
   Enregistre un achat de jeu
   - Stocke le prix au moment de l'achat (historique)
   - Transaction avec rollback si erreur
   """
   try:
       new_purchase = Purchase(user_id=user_id, game_id=game_id, price=price)
       db.add(new_purchase)
       db.commit()
       db.refresh(new_purchase)
       return new_purchase
   except Exception as e:
       db.rollback()
       raise HTTPException(status_code=500, detail=f"Erreur création achat: {str(e)}")

def get_user_purchases(db: Session, user_id: int) -> List[Purchase]:
   """Récupère tous les achats d'un utilisateur"""
   return db.query(Purchase).filter(Purchase.user_id == user_id).all()

# ================== GESTION MESSAGES/CHAT ==================

def get_game_messages(db: Session, game_id: int) -> List[Message]:
   """Récupère les messages d'un jeu triés chronologiquement"""
   return db.query(Message).filter(Message.game_id == game_id).order_by(Message.created_at).all()

def create_message(db: Session, user_id: int, game_id: int, content: str) -> Message:
   """
   Crée un message dans le chat d'un jeu
   - Vérifie que l'user possède le jeu avant de poster
   - Seuls les propriétaires peuvent poster des messages
   """
   purchase = db.query(Purchase).filter(Purchase.user_id == user_id, Purchase.game_id == game_id).first()
   
   if not purchase:
       raise HTTPException(status_code=403, detail="Vous devez acheter le jeu pour poster des messages")

   try:
       new_message = Message(user_id=user_id, game_id=game_id, content=content)
       db.add(new_message)
       db.commit()
       db.refresh(new_message)
       return new_message
   except Exception as e:
       db.rollback()
       raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

# ================== ADMINISTRATION ==================

def ban_user(db: Session, *, admin_id: int, user_id: int) -> bool:
   """
   Bannit un utilisateur (admin uniquement)
   - Vérifie droits admin et que la cible n'est pas admin
   - Ban immédiat avec flag is_banned
   """
   admin = db.query(User).filter(User.user_id == admin_id, User.is_admin == True).first()
   user = db.query(User).filter(User.user_id == user_id).first()
   
   if not admin or not user or user.is_admin:
       return False
   
   user.is_banned = True
   db.commit()
   return True

def unban_user(db: Session, *, admin_id: int, user_id: int) -> bool:
   """
   Débannit un utilisateur (admin uniquement)
   - Réactivation immédiate du compte
   """
   admin = db.query(User).filter(User.user_id == admin_id, User.is_admin == True).first()
   user = db.query(User).filter(User.user_id == user_id, User.is_banned == True).first()
   
   if not admin or not user:
       return False
   
   user.is_banned = False
   db.commit()
   return True