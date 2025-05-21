from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine, String, Integer, DateTime, ForeignKey, Float, Boolean, Text
from sqlalchemy.orm import relationship, declarative_base, Mapped, mapped_column, sessionmaker, Session
from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
Base = declarative_base()

class User(Base):
    """Modèle pour les utilisateurs"""
    __tablename__ = "users"
    
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(60), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    purchases: Mapped[List["Purchase"]] = relationship(back_populates="user")
    messages: Mapped[List["Message"]] = relationship(back_populates="user")

class Game(Base):
    """Modèle pour les jeux"""
    __tablename__ = "games"
    
    game_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    release_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    image: Mapped[Optional[str]] = mapped_column(String(200), nullable=True, default=None)
    publisher: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(50))
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    platforms: Mapped[str] = mapped_column(String(100))
    
    purchases: Mapped[List["Purchase"]] = relationship(back_populates="game")
    messages: Mapped[List["Message"]] = relationship(back_populates="game")

class Purchase(Base):
    """Modèle pour les achats"""
    __tablename__ = "purchases"
    
    purchase_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=False)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey("games.game_id"), nullable=False)
    purchase_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="purchases")
    game: Mapped["Game"] = relationship(back_populates="purchases")

class Message(Base):
    """Modèle pour les messages"""
    __tablename__ = "messages"
    
    message_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=False)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey("games.game_id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    content: Mapped[str] = mapped_column(String(500), nullable=False)
    
    user: Mapped["User"] = relationship(back_populates="messages")
    game: Mapped["Game"] = relationship(back_populates="messages")




# Configuration de la base de données
DATABASE_URL = "sqlite:///./game_store.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Initialise la base de données"""
    Base.metadata.create_all(bind=engine)

class Rating(Base):
    __tablename__ = "ratings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    game_id = Column(Integer, ForeignKey("games.id"))
    rating = Column(Integer)  # entre 1 et 5

    user = relationship("User", back_populates="ratings")
    game = relationship("Game", back_populates="ratings")

# Dans la classe User
ratings = relationship("Rating", back_populates="user")

# Dans la classe Game
ratings = relationship("Rating", back_populates="game")


# backend.py (ajout)
def add_rating(db: Session, user_id: int, game_id: int, rating: int):
    if not 1 <= rating <= 5:
        raise HTTPException(status_code=400, detail="La note doit être entre 1 et 5")

    db_rating = Rating(user_id=user_id, game_id=game_id, rating=rating)
    db.add(db_rating)
    db.commit()
    db.refresh(db_rating)
    return db_rating


# post.py (ajout de route)
@router.post("/games/{game_id}/rate")
async def rate_game(
    game_id: int,
    rating: int = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return add_rating(db, user_id=current_user.id, game_id=game_id, rating=rating)
-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
#code web cam
from fastapi import WebSocket

connected_clients = []

@app.websocket("/ws/messages/{game_id}")
async def websocket_messages(websocket: WebSocket, game_id: int):
    await websocket.accept()
    connected_clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            for client in connected_clients:
                await client.send_text(f"[Jeu {game_id}] Nouveau message: {data}")
    except:
        connected_clients.remove(websocket)
