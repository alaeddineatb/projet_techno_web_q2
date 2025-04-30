from fastapi import Request, APIRouter,HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from backend import get_db, get_all_games, get_game_by_id, get_game_messages, get_current_user, Depends
from models import Game
import pathlib
import json
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
async def profile_page(request: Request, user = Depends(get_current_user)):
    return templates.TemplateResponse("profile.html", {"request": request})



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

