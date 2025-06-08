"""
Routes de visualisation (GET) pour l'application Game Store

Organisation:
- Pages publiques : home, login, signup
- Pages authentifiées : profile, browse, games
- API endpoints : données JSON pour le frontend
- Administration : interface admin

Templates utilisés:
- auth/ : login.html, signup.html, forgot.html
- index.html, profile.html, browse.html, games.html
- ratings.html, message.html, admin.html
"""
from fastapi import Request, APIRouter, HTTPException, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from backend import get_db, get_all_games, get_game_by_id, get_game_messages, get_current_user, verify_admin
from models import Game, User, Message, Purchase, Rating
import pathlib
import json
import traceback
from sqlalchemy.orm import Session, joinedload

router = APIRouter()

# Configuration des templates Jinja2
templates_path = pathlib.Path(__file__).parent / "templates"
templates = Jinja2Templates(directory=templates_path)

# ================== PAGES PUBLIQUES ==================

@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Page d'accueil - Landing page publique"""
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/login", response_class=HTMLResponse)
async def login_form(request: Request):
    """Formulaire de connexion"""
    return templates.TemplateResponse("auth/login.html", {"request": request})

@router.get("/signup", response_class=HTMLResponse)
async def register_form(request: Request):
    """Formulaire d'inscription"""
    return templates.TemplateResponse("auth/signup.html", {"request": request})

@router.get("/forgot", response_class=HTMLResponse)
async def forgot_password(request: Request):
    """Page de réinitialisation mot de passe"""
    return templates.TemplateResponse("auth/forgot.html", {"request": request})

# ================== PAGES AUTHENTIFIÉES ==================

@router.get("/profile")
async def profile_page(request: Request, user: User = Depends(get_current_user)):
    """
    Page profil utilisateur
    - Requiert authentification
    - Affiche username et photo de profil
    """
    return templates.TemplateResponse("profile.html", {
        "request": request,
        "username": user.username, 
        "profile_pic": user.photo_url or "/static/photos/default.jpg"
    })

@router.get("/browse")
async def browse_page(request: Request):
    """Page de navigation des jeux (version simple sans données)"""
    return templates.TemplateResponse("browse.html", {"request": request})    

@router.get("/games", response_class=HTMLResponse)
async def browse_games(request: Request):
    """
    Page de navigation avec liste des jeux
    - Charge tous les jeux depuis la DB
    - Passe les données en JSON pour le JS frontend
    """
    db = next(get_db())
    games = get_all_games(db)
    
    # Préparation des données pour le JavaScript
    games_data = [{
        "game_id": game.game_id,
        "title": game.title,
        "description": game.description,
        "price": float(game.price),
        "rating_avg": float(game.rating_avg or 0),
        "image": game.image or "#333"
    } for game in games]

    return templates.TemplateResponse(
        "browse.html",
        {
            "request": request,
            "games": games,
            "games_data": json.dumps(games_data)  # Pour utilisation JS
        }
    )

@router.get("/game/{game_id}")
async def get_game_page(request: Request, game_id: int):
    """Page détail d'un jeu spécifique"""
    return templates.TemplateResponse("games.html", {"request": request})

@router.get("/ratings", response_class=HTMLResponse)
async def ratings_page(request: Request):
    """
    Page des évaluations
    - Affiche les jeux les mieux notés
    """
    db = next(get_db())
    top_games = get_all_games(db, limit=10)  # Top 10 games
    return templates.TemplateResponse(
        "ratings.html",
        {"request": request, "top_games": top_games}
    )

@router.get("/message", response_class=HTMLResponse)
async def message_page(request: Request):
    """Page de messagerie/chat"""
    return templates.TemplateResponse("message.html", {"request": request})

# ================== API ENDPOINTS (JSON) ==================

@router.get("/games/{game_id}/messages")
async def get_messages(game_id: int, db: Session = Depends(get_db)):
    """
    API: Récupère les messages d'un jeu
    - Retourne les 100 derniers messages
    - Triés par date décroissante
    """
    try:
        messages = db.query(Message)\
            .join(User)\
            .filter(Message.game_id == game_id)\
            .order_by(Message.created_at.desc())\
            .limit(100)\
            .all()

        return [
            {
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
                "user": {"username": msg.user.username}
            }
            for msg in messages
        ]
    except Exception as e:
        print(f"ERREUR BDD: {str(e)}")
        raise HTTPException(status_code=500)

@router.get("/api/user/purchases")
async def get_user_purchases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    API: Liste les achats de l'utilisateur connecté
    - Utilise joinedload pour optimiser les requêtes
    - Retourne les infos du jeu avec chaque achat
    """
    try:
        # Eager loading pour éviter N+1 queries
        purchases = db.query(Purchase).options(joinedload(Purchase.game)).filter(
            Purchase.user_id == current_user.user_id
        ).all()
        
        if not purchases:
            return []

        # Format des données pour le frontend
        result = []
        for purchase in purchases:
            game = purchase.game
            result.append({
                "id": game.game_id,
                "title": game.title,
                "category": game.category,
                "image": game.image,
                "price": purchase.price,  # Prix à l'achat
                "purchase_date": purchase.purchase_date.isoformat() if purchase.purchase_date else None,
                "rating_avg": game.rating_avg
            })
        
        return result
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur serveur: {str(e)}"
        )

@router.get("/api/user/messages")
async def get_user_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    API: Liste les messages postés par l'utilisateur
    - Triés par date décroissante
    - Inclut les infos du jeu concerné
    """
    try:
        messages = db.query(Message).options(joinedload(Message.game)).filter(
            Message.user_id == current_user.user_id
        ).order_by(Message.created_at.desc()).all()
        
        if not messages:
            return []

        result = []
        for message in messages:
            result.append({
                "message_id": message.message_id,
                "content": message.content,
                "created_at": message.created_at.isoformat(),
                "game": {
                    "id": message.game.game_id,
                    "title": message.game.title
                }
            })
        
        return result
        
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur serveur: {str(e)}"
        )

@router.get("/api/games")
async def get_all_games_api(db: Session = Depends(get_db)):
    """
    API: Liste tous les jeux (format JSON)
    - Version simplifiée pour listing
    """
    try:
        games = db.query(Game).all()
        return [{
            "game_id": game.game_id,
            "title": game.title,
            "image": game.image,
            "price": game.price,
            "category": game.category
        } for game in games]
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur serveur: {str(e)}"
        )

@router.get("/api/ratings")
async def get_all_ratings(db: Session = Depends(get_db)):
    """
    API: Liste toutes les évaluations
    - Eager loading des relations user/game
    - Retourne les infos complètes
    """
    try:
        # Optimisation avec joinedload
        ratings = db.query(Rating).options(
            joinedload(Rating.user),
            joinedload(Rating.game)
        ).all()
        
        result = []
        for rating in ratings:
            result.append({
                "rating_id": rating.rating_id,
                "value": rating.value,
                "created_at": rating.created_at.isoformat(),
                "user": {
                    "user_id": rating.user.user_id,
                    "username": rating.user.username
                },
                "game": {
                    "game_id": rating.game.game_id,
                    "title": rating.game.title,
                    "image": rating.game.image
                }
            })
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur serveur: {str(e)}"
        )

# ================== ADMINISTRATION ==================

@router.get("/admin")
async def admin_page(request: Request, admin: User = Depends(verify_admin)):
    """
    Page d'administration
    - Requiert droits admin
    """
    return templates.TemplateResponse("admin.html", {"request": request})

@router.get("/admin/users")
async def get_users_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(verify_admin)
):
    """
    API Admin: Liste tous les utilisateurs
    - Infos sensibles limitées
    - Inclut statut de bannissement
    """
    users = db.query(User).all()
    return [
        {
            "user_id": u.user_id,
            "username": u.username,
            "email": u.email,
            "is_banned": u.is_banned
        } 
        for u in users
    ]