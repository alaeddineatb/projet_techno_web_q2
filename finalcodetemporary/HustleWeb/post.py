from fastapi import FastAPI, Request, Form, HTTPException, APIRouter, Depends
from fastapi.responses import RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import random
from backend import hash_password
from backend import (
    get_db, create_user, authenticate_user, 
    create_game, create_purchase, create_message,
    ban_user,get_current_user,verify_admin
)
from models import User
from pathlib import Path



router = APIRouter()
templates = Jinja2Templates(directory="templates")
router.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")

reset_codes = {}  # Stockage temporaire des codes de réinitialisation

# ✅ Route d'inscription
@router.post("/signup")
async def register_user(
    request: Request,
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)  # ✅ Utilisation correcte de la session DB
):
    user = create_user(db, username=username, email=email, password=password)
    if not user:
        return templates.TemplateResponse(
            "auth/register.html",
            {"request": request, "error": "Username or email already exists"},
            status_code=400
        )
    return RedirectResponse(url="/login", status_code=303)

# ✅ Route de connexion (sans gestion de session pour l'instant)
@router.post("/login")
async def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, email=email, password=password)
    if not user:
        return templates.TemplateResponse(
            "auth/login.html",
            {"request": request, "error": "Invalid credentials"},
            status_code=401
        )

    response = RedirectResponse(url="/profile", status_code=303)
    # TODO: Ajouter un token JWT ou une session cookie ici pour garder l'utilisateur connecté
    return response

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

# ✅ Route pour acheter un jeu
@router.post("/games/{game_id}/purchase")
@router.post("/purchase")
async def purchase(
    game_id: int,
    current_user: User = Depends(get_current_user),  # ✅ User venant du JWT
    db: Session = Depends(get_db)
):
    success=create_purchase(db, user_id=current_user.user_id, game_id=game_id)
    if not success:
        raise HTTPException(status_code=400, detail="Purchase failed")

    return RedirectResponse(url=f"/games/{game_id}", status_code=303)

# ✅ Route pour envoyer un message (seuls les acheteurs du jeu peuvent poster)
@router.post("/games/{game_id}/message")
async def post_message(
    request: Request,
    game_id: int,
    content: str = Form(...),
    user_id: int = Form(...),  # ⚠ Doit venir d'une session sécurisée
    db: Session = Depends(get_db)
):
    message = create_message(db, user_id=user_id, game_id=game_id, content=content)
    if not message:
        raise HTTPException(status_code=400, detail="Could not post message")

    return RedirectResponse(url=f"/games/{game_id}", status_code=303)

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
