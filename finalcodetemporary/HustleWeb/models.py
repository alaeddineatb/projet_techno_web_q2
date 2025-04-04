from datetime import datetime
from typing import Optional, List
from sqlalchemy import create_engine, String, Integer, DateTime, ForeignKey, Float, Boolean, Text
from sqlalchemy.orm import relationship, declarative_base, Mapped, mapped_column, sessionmaker, Session

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

