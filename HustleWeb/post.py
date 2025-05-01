from fastapi import FastAPI, Request, Form, HTTPException, APIRouter, Depends
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import random
import datetime
from datetime import timedelta, timezone,datetime
from fastapi.responses import JSONResponse
from fastapi import File, UploadFile
from backend import create_jwt, hash_password
from backend import (
    get_db, create_user, authenticate_user, 
    create_game, create_purchase, create_message,
    ban_user,get_current_user,verify_admin
)
from models import User,Game
from pathlib import Path
import pathlib



router = APIRouter()
templates_path = pathlib.Path(__file__).parent/ "templates"
templates = Jinja2Templates(directory=templates_path)

router.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

reset_codes = {}  

# ✅ Route d'inscription
@router.post("/signup")
async def register_user(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    try:
        print("Data received:", username, email) 
        user = create_user(db, username=username, email=email, password=password)
        print("User created:", user) 
        if not user:
            return templates.TemplateResponse(
                "auth/signup.html",
                {"request": request, "error": "Username or email already exists"},
                status_code=400
            )
        return RedirectResponse(url="/login", status_code=303)
    except Exception as e:
        print(f"Error: {str(e)}")  # Pour voir l'erreur
        raise


@router.post("/login")
async def login(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
 user = authenticate_user(db, username=username, password=password)
 if not user:
        return JSONResponse(
            status_code=401,
            content={"success": False, "error": "Invalid credentials"}
        )
    

 token = create_jwt(user.user_id)
 response = JSONResponse({"success": True})
    
 response.set_cookie(
    key="token",
    value=token,
    httponly=True,
    samesite="Lax",  # "None" si frontend/backend séparés
    secure=False,     # False en dev (HTTP), True en prod (HTTPS)
    path="/",         # Le cookie est envoyé pour toutes les routes
    max_age=86400     # Durée de vie du cookie (en secondes)
 )
    
 return response
@router.post("/profile/update")
async def update_profile(
    request: Request,
    photo: UploadFile = File(None),
    user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if photo:

        file_location = f"static/photos/{user.user_id}.jpg"
        with open(file_location, "wb+") as file_object:
            file_object.write(photo.file.read())
        user.photo_url = file_location

    db.commit()
    return {"success": True}


# ✅ Route pour ajouter un jeu (admin uniquement)
@router.post("/games/add")
async def add_new_game(
    request: Request,
    title: str = Form(...),
    price: float = Form(...),
    description: str = Form(...),
    publisher: str = Form(...),
    category: str = Form(...),
    platforms: str = Form(...),
    db: Session = Depends(get_db)
):
    # TODO: Vérifier que l'utilisateur est admin
    game = create_game(
        db,
        title=title,
        description=description,
        price=price,
        publisher=publisher,
        category=category,
        platforms=platforms
    )
    if not game:
        raise HTTPException(status_code=400, detail="Could not create game")

    return RedirectResponse(url="/games", status_code=303)


@router.post("/games/purchase")
async def purchase_game(game_id: int, user = Depends(get_current_user), db: Session = Depends(get_db)):
    purchase = create_purchase(db, user.user_id, game_id)
    return {"success": True}

@router.get("/games/{game_id}")
async def get_game(game_id: int, db: Session = Depends(get_db)):
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404)
    return game



@router.post("/games/rate")
async def rate_game(game_id: int, rating: int, db: Session = Depends(get_current_user)):
    game = db.query(Game).filter(Game.game_id == game_id).first()
    if not game:
        raise HTTPException(status_code=404)
    game.rating_avg = (game.rating_avg + rating) / 2  
    db.commit()
    return {"success": True}





# ✅ Route admin pour bannir un utilisateur (vérification admin ajoutée)
@router.post("/admin/ban/{user_id}")
async def ban_user(
    user_id: int,
    admin: User = Depends(verify_admin),  # ✅ Vérification automatique
    db: Session = Depends(get_db)
):
    admin=ban_user(db, admin_id=admin.user_id, user_id=user_id)
    if not admin:
        raise HTTPException(status_code=403, detail="Not authorized")


    return RedirectResponse(url="/admin", status_code=303)

# ✅ Route pour récupérer un code de réinitialisation de mot de passe
@router.post("/forgot")
async def forgot_password(
    email: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")

    # Générer un code à 6 chiffres
    code = str(random.randint(100000, 999999))
    reset_codes[email] = code
    print(f"Code envoyé à {email}: {code}")  # ⚠ À remplacer par un email réel

    return {"message": "Code envoyé"}

# ✅ Route pour valider le code et réinitialiser le mot de passe
@router.post("/validate-code")
async def validate_reset_code(
    emailuser: str = Form(...),
    code: str = Form(...)
):
    if emailuser not in reset_codes or reset_codes[emailuser] != code:
        raise HTTPException(status_code=400, detail="Invalid code")

    return {"message": "Code valid"}

@router.post("/reset-password")
async def reset_password(
    email: str = Form(...),
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(new_password)  # Utiliser ta fonction de hash
    db.commit()

    return {"message": "Password reset successful"}
