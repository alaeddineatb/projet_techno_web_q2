from fastapi import Request, APIRouter,HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse,JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi import Depends
from backend import get_db, get_all_games, get_game_by_id, get_game_messages, get_current_user
from models import Game,User,Message,Purchase,Rating
import pathlib
import json
import traceback
from sqlalchemy.orm import Session, joinedload
router = APIRouter()

templates_path = pathlib.Path(__file__).parent/ "templates"
templates = Jinja2Templates(directory=templates_path)

@router.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@router.get("/login", response_class=HTMLResponse)
async def login_form(request: Request):
    return templates.TemplateResponse("auth/login.html", {"request": request})

@router.get("/signup", response_class=HTMLResponse)
async def register_form(request: Request):
    return templates.TemplateResponse("auth/signup.html", {"request": request})

@router.get("/forgot", response_class=HTMLResponse)
async def forgot_password(request: Request):
    return templates.TemplateResponse("auth/forgot.html", {"request": request})

@router.get("/profile")
async def profile_page(request: Request, user: User = Depends(get_current_user)):
    return templates.TemplateResponse("profile.html", {
        "request": request,
        "username": user.username, 
        "profile_pic": user.photo_url or "/static/photos/default.jpg"  # Injecte la photo
    })



@router.get("/browse")
async def browse_page(request: Request):
    return templates.TemplateResponse("browse.html", {"request": request})    

@router.get("/games", response_class=HTMLResponse)
async def browse_games(request: Request):
    db = next(get_db())
    games = get_all_games(db)
    
    games_data = [{
        "game_id": game.game_id,
        "title": game.title,
        "description": game.description,
        "price": float(game.price),
        "rating_avg": float(game.rating_avg or 0),  # Valeur par défaut
        "image": game.image or "#333"  # Valeur par défaut
    } for game in games]

    return templates.TemplateResponse(
        "browse.html",
        {
            "request": request,
            "games": games,
            "games_data": json.dumps(games_data)
        }
    )


@router.get("/game/{game_id}")
async def get_game_page(request: Request, game_id: int):
    return templates.TemplateResponse("games.html", {"request": request})



@router.get("/ratings", response_class=HTMLResponse)
async def ratings_page(request: Request):
    db = next(get_db())
    # Vous pourriez récupérer les jeux les mieux notés ici
    top_games = get_all_games(db, limit=10)  # Exemple simplifié
    return templates.TemplateResponse(
        "ratings.html",
        {"request": request, "top_games": top_games}
    )

@router.get("/message", response_class=HTMLResponse)
async def message_page(request: Request):
    return templates.TemplateResponse("message.html", {"request": request})

@router.get("/games/{game_id}/messages")
async def get_messages(game_id: int, db: Session = Depends(get_db)):
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
        print(f"ERREUR BDD: {str(e)}")  # Debug crucial
        raise HTTPException(status_code=500)


@router.get("/api/user/purchases")
async def get_user_purchases(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:

        purchases = db.query(Purchase).options(joinedload(Purchase.game)).filter(
            Purchase.user_id == current_user.user_id
        ).all()
        
        if not purchases:
            return []

        result = []
        for purchase in purchases:
            game = purchase.game
            result.append({
                "id": game.game_id,
                "title": game.title,
                "category": game.category,
                "image": game.image,
                "price": purchase.price,
                "purchase_date": purchase.purchase_date.isoformat() if purchase.purchase_date else None,
                "rating_avg": game.rating_avg
            })
        
        return result
        
    except Exception as e:

        import traceback
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
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur serveur: {str(e)}"
        )
    

@router.get("/api/user/ratings")
async def get_user_ratings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:

        ratings = db.query(Rating).options(joinedload(Rating.game)).filter(
            Rating.user_id == current_user.user_id
        ).order_by(Rating.created_at.desc()).all()
        
        if not ratings:
            return []


        result = []
        for rating in ratings:
            result.append({
                "rating_id": rating.rating_id,
                "value": rating.value,
                "created_at": rating.created_at.isoformat(),
                "game": {
                    "id": rating.game.game_id,
                    "title": rating.game.title,
                    "image": rating.game.image,
                    "rating_avg": rating.game.rating_avg
                }
            })
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur serveur: {str(e)}"
        )    
    



@router.get("/api/games")
async def get_all_games(db: Session = Depends(get_db)):
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
    try:

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