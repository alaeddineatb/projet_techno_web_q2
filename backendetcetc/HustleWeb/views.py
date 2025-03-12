from fastapi import FastAPI, Request, Form, HTTPException,Response
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import FastAPI, Request,APIRouter
from fastapi.staticfiles import StaticFiles


router = APIRouter()

templates = Jinja2Templates(directory="templates")
router.mount("/templates", StaticFiles(directory="templates"), name="templates")


###@app.get("/games")##""
##async def games_page(request: Request):##
    # Ici tu peux récupérer la liste des jeux depuis ta base de données
    ###games_list = get_games_from_db()  # Fonction hypothétique
   # return templates.TemplateResponse("games.html", #
      #  {"request": request, "games": games_list})#


@router.get("/")
async def home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})

@router.get("/register")
async def register_form(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@router.get("/login")
async def login_form(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@router.get("/profile")
async def profile(request: Request):
    return templates.TemplateResponse("profile.html", {"request": request})

@router.get("/forgot")
async def forgot_form(request: Request):
    return templates.TemplateResponse("forgot.html", {"request": request})

@router.get("/purchase")
async def purchase_form(request: Request):
    return templates.TemplateResponse("purchase.html", {"request": request})
