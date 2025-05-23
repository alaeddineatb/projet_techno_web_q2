from fastapi import Request, APIRouter,HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi import Depends
from backend import get_db, get_all_games, get_game_by_id, get_game_messages, get_current_user
from models import Game,User,Message
import pathlib
import json
from sqlalchemy.orm import Session
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

@router.get("/browse", response_class=HTMLResponse)
async def browse_games(request: Request):
    db = next(get_db())
    games = get_all_games(db)
    
    games_data = [{
        "game_id": game.game_id,
        "title": game.title,
        "description": game.description,
        "price": float(game.price),
        "release_date": game.release_date.isoformat(),
        "publisher": game.publisher,
        "category": game.category,
        "rating_avg": float(game.rating_avg or 0),
        "platforms": game.platforms,
        "image": game.image
    } for game in games]

    # Créer les données pour le frontend
    frontend_data = {
        "allGames": games_data,
        "featuredGames": [g for g in games_data if g["rating_avg"] >= 4.5],
        "gameCategories": list(set(g["category"] for g in games_data))
    }

    return templates.TemplateResponse(
        "browse.html",
        {
            "request": request,
            "games_data": json.dumps(frontend_data)
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
