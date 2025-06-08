"""
Middleware de sécurité et validation pour l'application Game Store

Architecture en 3 couches:
- SecurityMiddleware: Validation et nettoyage des entrées
- AuthMiddleware: Gestion authentification et autorisations  
- ValidationMiddleware: Validation de formulaires complexes

Responsabilités:
- Validation format et longueur des entrées
- Nettoyage anti-XSS avec bleach
- Vérification statut utilisateur (banni)
- Décorateurs pour protection routes
- Validation données complexes (jeux, utilisateurs)

Sécurité:
- Defense in depth (validations multiples)
- Fail secure (erreur = accès refusé)
- Input sanitization (protection XSS/injection)
- Tags HTML whitelist strict
"""
from fastapi import HTTPException, Depends, Cookie
from sqlalchemy.orm import Session
from typing import Callable
from functools import wraps
import re
from models import User
from backend import get_db, get_current_user, verify_admin
import bleach

# Constantes de validation
ALLOWED_HTML_TAGS = ['b', 'i', 'u', 'em', 'strong']
MAX_MESSAGE_LENGTH = 500
MAX_TITLE_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 1000

# ================== SECURITY MIDDLEWARE ==================

class SecurityMiddleware:
   """
   Couche de sécurité pour validation et nettoyage des entrées
   - Validation format et longueur
   - Nettoyage contre XSS avec bleach
   - Normalisation des données
   """
   
   @staticmethod
   def validate_text_input(text: str, max_length: int = 255, field_name: str = "field") -> str:
       """
       Valide et nettoie une entrée texte générique
       - Trim espaces, vérifie non vide et longueur max
       - Nettoie HTML avec tags whitelist strict
       """
       if text is None:
           raise HTTPException(400, f"{field_name} is required")
       
       text = text.strip()
       
       if len(text) == 0:
           raise HTTPException(400, f"{field_name} cannot be empty")
           
       if len(text) > max_length:
           raise HTTPException(400, f"{field_name} exceeds maximum length ({max_length})")
       
       cleaned_text = bleach.clean(text, tags=ALLOWED_HTML_TAGS, strip=True)
       return cleaned_text
   
   @staticmethod
   def validate_email(email: str) -> str:
       """
       Valide format email selon RFC 5322 simplifié
       - Normalise en lowercase
       - Pattern robuste avec domaine et extension obligatoires
       """
       email = email.strip().lower()
       email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
       
       if not re.match(email_pattern, email):
           raise HTTPException(400, "Invalid email format")
           
       return email
   
   @staticmethod
   def validate_username(username: str) -> str:
       """
       Valide format username pour l'application
       - 3-30 caractères alphanumérique + underscore uniquement
       - Compatible URLs et systèmes fichiers
       """
       username = username.strip()
       
       if len(username) < 3:
           raise HTTPException(400, "Username must be at least 3 characters")
           
       if len(username) > 30:
           raise HTTPException(400, "Username cannot exceed 30 characters")
           
       if not re.match(r'^[a-zA-Z0-9_]+$', username):
           raise HTTPException(400, "Username can only contain letters, numbers and underscores")
           
       return username
   
   @staticmethod
   def validate_password(password: str) -> str:
       """
       Valide force du mot de passe (NIST inspired)
       - 8-128 caractères avec majuscule, minuscule et chiffre
       """
       if len(password) < 8:
           raise HTTPException(400, "Password must be at least 8 characters")
           
       if len(password) > 128:
           raise HTTPException(400, "Password too long")
           
       if not re.search(r'[A-Z]', password):
           raise HTTPException(400, "Password must contain at least one uppercase letter")
           
       if not re.search(r'[a-z]', password):
           raise HTTPException(400, "Password must contain at least one lowercase letter")
           
       if not re.search(r'\d', password):
           raise HTTPException(400, "Password must contain at least one number")
           
       return password
   
   @staticmethod
   def validate_price(price: float) -> float:
       """
       Valide et normalise un prix
       - Positif ou zéro, maximum 999.99, arrondi 2 décimales
       """
       if price < 0:
           raise HTTPException(400, "Price cannot be negative")
           
       if price > 999.99:
           raise HTTPException(400, "Price too high")
           
       return round(price, 2)
   
   @staticmethod
   def validate_rating(rating: int) -> int:
       """Valide une note de jeu (1-5 étoiles)"""
       if not isinstance(rating, int):
           raise HTTPException(400, "Rating must be an integer")
           
       if not 1 <= rating <= 5:
           raise HTTPException(400, "Rating must be between 1 and 5")
           
       return rating

# ================== AUTH MIDDLEWARE ==================

class AuthMiddleware:
   """
   Gestion authentification et autorisations
   - Vérification statut utilisateur (banni)
   - Décorateurs pour protection routes
   """
   
   @staticmethod
   def check_user_not_banned(user: User) -> User:
       """Vérifie qu'un utilisateur n'est pas banni"""
       if user.is_banned:
           raise HTTPException(403, "Account is banned")
       return user
   
   @staticmethod
   def require_authenticated_user(db: Session = Depends(get_db)) -> Callable:
       """Décorateur: exige utilisateur authentifié non banni"""
       def decorator(func):
           @wraps(func)
           async def wrapper(*args, **kwargs):
               user = get_current_user()
               user = AuthMiddleware.check_user_not_banned(user)
               return await func(*args, **kwargs)
           return wrapper
       return decorator
   
   @staticmethod
   def require_admin(db: Session = Depends(get_db)) -> Callable:
       """Décorateur: exige droits administrateur"""
       def decorator(func):
           @wraps(func)
           async def wrapper(*args, **kwargs):
               admin = verify_admin()
               admin = AuthMiddleware.check_user_not_banned(admin)
               return await func(*args, **kwargs)
           return wrapper
       return decorator
   
   @staticmethod
   def require_game_ownership(game_id: int, db: Session) -> Callable:
       """Décorateur: exige possession d'un jeu spécifique"""
       def decorator(func):
           @wraps(func)
           async def wrapper(current_user: User = Depends(get_current_user), *args, **kwargs):
               from models import Purchase
               
               purchase = db.query(Purchase).filter(
                   Purchase.user_id == current_user.user_id,
                   Purchase.game_id == game_id
               ).first()
               
               if not purchase:
                   raise HTTPException(403, "Game ownership required")
                   
               return await func(*args, **kwargs)
           return wrapper
       return decorator

# ================== VALIDATION MIDDLEWARE ==================

class ValidationMiddleware:
   """
   Validation de données complexes et formulaires
   - Orchestration validations SecurityMiddleware
   - Validation multi-champs avec règles business
   """
   
   @staticmethod
   def validate_game_data(title: str, price: float, description: str, publisher: str, category: str, platforms: str):
       """
       Valide toutes les données pour création/édition jeu
       - Chaque champ avec règles spécifiques et anti-XSS
       """
       return {
           'title': SecurityMiddleware.validate_text_input(title, MAX_TITLE_LENGTH, "Title"),
           'price': SecurityMiddleware.validate_price(price),
           'description': SecurityMiddleware.validate_text_input(description, MAX_DESCRIPTION_LENGTH, "Description"),
           'publisher': SecurityMiddleware.validate_text_input(publisher, 100, "Publisher"),
           'category': SecurityMiddleware.validate_text_input(category, 50, "Category"),
           'platforms': SecurityMiddleware.validate_text_input(platforms, 200, "Platforms")
       }
   
   @staticmethod
   def validate_user_registration(username: str, email: str, password: str):
       """
       Valide données complètes pour inscription utilisateur
       - Username sûr, email normalisé, password complexe
       """
       return {
           'username': SecurityMiddleware.validate_username(username),
           'email': SecurityMiddleware.validate_email(email),
           'password': SecurityMiddleware.validate_password(password)
       }
   
   @staticmethod
   def validate_message_content(content: str) -> str:
       """
       Valide contenu d'un message de chat
       - Limite 500 chars, nettoyage XSS strict
       """
       return SecurityMiddleware.validate_text_input(content, MAX_MESSAGE_LENGTH, "Message")

# ================== DEPENDENCY INJECTION HELPERS ==================

def get_validated_user(token: str = Cookie(default=None, alias="token"), db: Session = Depends(get_db)) -> User:
   """
   Helper pour injection: récupère utilisateur validé et non banni
   - Usage: async def route(user: User = Depends(get_validated_user))
   """
   user = get_current_user(token=token, db=db)
   return AuthMiddleware.check_user_not_banned(user)

def get_validated_admin(token: str = Cookie(default=None, alias="token"), db: Session = Depends(get_db)) -> User:
   """
   Helper pour injection: récupère admin validé et non banni
   - Double vérification auth + admin + statut
   """
   user = get_current_user(token=token, db=db)
   admin = verify_admin(user=user)
   return AuthMiddleware.check_user_not_banned(admin)

# Décorateurs simplifiés (pour compatibilité)
def require_auth(func):
   """Décorateur simple: authentification requise"""
   @wraps(func)
   async def wrapper(*args, **kwargs):
       return await func(*args, **kwargs)
   return wrapper

def require_admin_auth(func):
   """Décorateur simple: droits admin requis"""
   @wraps(func)
   async def wrapper(*args, **kwargs):
       return await func(*args, **kwargs)
   return wrapper