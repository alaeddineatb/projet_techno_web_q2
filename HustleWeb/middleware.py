
from fastapi import HTTPException, Depends, Cookie
from sqlalchemy.orm import Session
from typing import Callable
from functools import wraps
import re
from models import User
from backend import get_db, get_current_user, verify_admin
import bleach

ALLOWED_HTML_TAGS = ['b', 'i', 'u', 'em', 'strong']
MAX_MESSAGE_LENGTH = 500
MAX_TITLE_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 1000

class SecurityMiddleware:
    """Validation et nettoyage des entrées utilisateur"""
    
    @staticmethod
    def validate_text_input(text: str, max_length: int = 255, field_name: str = "field") -> str:
        """Valide et nettoie les entrées texte contre XSS"""
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
        """Format email valide (RFC 5322 simplifié)"""
        email = email.strip().lower()
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(email_pattern, email):
            raise HTTPException(400, "Invalid email format")
            
        return email
    
    @staticmethod
    def validate_username(username: str) -> str:
        """Username: 3-30 caractères, alphanumérique + underscore"""
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
        """Password: 8+ chars, 1 maj, 1 min, 1 chiffre"""
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
        """Prix: 0-999.99, arrondi 2 décimales"""
        if price < 0:
            raise HTTPException(400, "Price cannot be negative")
            
        if price > 999.99:
            raise HTTPException(400, "Price too high")
            
        return round(price, 2)
    
    @staticmethod
    def validate_rating(rating: int) -> int:
        """Note: entier entre 1 et 5"""
        if not isinstance(rating, int):
            raise HTTPException(400, "Rating must be an integer")
            
        if not 1 <= rating <= 5:
            raise HTTPException(400, "Rating must be between 1 and 5")
            
        return rating

class AuthMiddleware:
    """Gestion authentification et autorisations"""
    
    @staticmethod
    def check_user_not_banned(user: User) -> User:
        """Vérifie le statut de bannissement"""
        if user.is_banned:
            raise HTTPException(403, "Account is banned")
        return user
    
    @staticmethod
    def require_authenticated_user(db: Session = Depends(get_db)) -> Callable:
        """Décorateur: utilisateur connecté non banni"""
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
        """Décorateur: admin non banni"""
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
        """Décorateur: propriété du jeu requise"""
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

class ValidationMiddleware:
    """Validation des formulaires et données complexes"""
    
    @staticmethod
    def validate_game_data(title: str, price: float, description: str, 
                          publisher: str, category: str, platforms: str):
        """Valide toutes les données d'un jeu"""
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
        """Valide les données d'inscription"""
        return {
            'username': SecurityMiddleware.validate_username(username),
            'email': SecurityMiddleware.validate_email(email),
            'password': SecurityMiddleware.validate_password(password)
        }
    
    @staticmethod
    def validate_message_content(content: str) -> str:
        """Valide le contenu d'un message"""
        return SecurityMiddleware.validate_text_input(content, MAX_MESSAGE_LENGTH, "Message")

# FIXED: Proper dependency injection
def get_validated_user(
    token: str = Cookie(default=None, alias="token"),
    db: Session = Depends(get_db)
) -> User:
    """Helper: récupère utilisateur validé"""
    user = get_current_user(token=token, db=db)
    return AuthMiddleware.check_user_not_banned(user)

def get_validated_admin(
    token: str = Cookie(default=None, alias="token"),
    db: Session = Depends(get_db)
) -> User:
    """Helper: récupère admin validé"""
    user = get_current_user(token=token, db=db)
    admin = verify_admin(user=user)
    return AuthMiddleware.check_user_not_banned(admin)

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