from fastapi import Request, APIRouter,HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from backend import get_db, get_all_games, get_game_by_id, get_game_messages
from models import Game
import pathlib
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

@router.get("/profile", response_class=HTMLResponse)
async def user_profile(request: Request):
    # Vous devriez récupérer les infos de l'utilisateur connecté
    return templates.TemplateResponse("profile.html", {"request": request})

@router.get("/games", response_class=HTMLResponse)
async def browse_games(request: Request):
    db = next(get_db())
    games = get_all_games(db)
    return templates.TemplateResponse(
        "browse.html",
        {"request": request, "games": games}
    )

@router.get("/games/{game_id}", response_class=HTMLResponse)
async def game_details(request: Request, game_id: int):
    db = next(get_db())
    game = get_game_by_id(db, game_id=game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    messages = get_game_messages(db, game_id=game_id)
    return templates.TemplateResponse(
        "games.html",
        {"request": request, "game": game, "messages": messages}
    )

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


@router.get("/browse")
async def browse_games(request: Request):
    return templates.TemplateResponse("browse.html", {"request": request})