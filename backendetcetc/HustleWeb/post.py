from fastapi import FastAPI, Request, Form, HTTPException,Response
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from fastapi import HTTPException
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi import FastAPI, Request,APIRouter
from fastapi.staticfiles import StaticFiles
from backend import get_db,hashedpassword,register,login_check,reset_password,validate_code,add_game,purchase_game,send_message,ban_user,unban_user
from models import db
router = APIRouter()

templates = Jinja2Templates(directory="templates")
router.mount("/templates", StaticFiles(directory="templates"), name="templates")



@router.post("/register")
async def register_user(request: Request, 
                       username: str = Form(...), 
                       password: str = Form(...),
                       email: str = Form(...)):
    if register(username, hashedpassword(password), email):
        return templates.TemplateResponse("login.html", 
            {"request": request, "message": "Registration successful"})
    return templates.TemplateResponse("register.html", 
        {"request": request, "error": "Registration failed"})

@router.post("/login")
async def login(request: Request, 
                username: str = Form(...), 
                password: str = Form(...)):
    if login_check(username, hashedpassword(password)):
        return templates.TemplateResponse("profile.html", 
            {"request": request, "username": username})
    return templates.TemplateResponse("login.html", 
        {"request": request, "error": "Invalid credentials"})

@router.post("/games")
async def add_game(request: Request,
                      user: str = Form(...),
                      title: str = Form(...),
                      price: float = Form(...),
                      description: str = Form(...),
                      publisher: str = Form(...),
                      category: str = Form(...)):
    if add_game(user, title, price, description, publisher, category):
        return templates.TemplateResponse("games.html", 
            {"request": request, "message": "Game added successfully"})
    return templates.TemplateResponse("games.html", 
        {"request": request, "error": "Failed to add game"})

@router.post("/forgot")
async def reset_pwd(request: Request, 
                   email: str = Form(...)):
    if reset_password(email):
        return templates.TemplateResponse("login.html", 
            {"request": request, "message": "Password reset email sent"})
    return templates.TemplateResponse("forgot.html", 
        {"request": request, "error": "Email not found"})

@router.post("/message")
async def send_msg(request: Request,
                  userid: int = Form(...),
                  gameid: int = Form(...),
                  message: str = Form(...)):
    if send_message(userid,gameid, message):
        return templates.TemplateResponse("profile.html", 
            {"request": request, "message": "Message sent"})
    return templates.TemplateResponse("profile.html", 
        {"request": request, "error": "Failed to send message"})

##@app.post("/ratings")
#async def rate_game(request: Request,
 #                  user: str = Form(...),
 #                  game: str = Form(...),
 #                  rating: int = Form(...)):
#    return templates.TemplateResponse("games.html", {"request": request})///
##
