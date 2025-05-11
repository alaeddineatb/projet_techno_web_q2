from datetime import datetime,timezone
from typing import Optional, List
from sqlalchemy import create_engine, String, Integer, DateTime, ForeignKey, Float, Boolean, Text
from sqlalchemy.orm import relationship, declarative_base, Mapped, mapped_column, sessionmaker, Session

Base = declarative_base()


class Rating(Base):
    __tablename__ = "ratings"
    rating_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=False)
    game_id: Mapped[int] = mapped_column(Integer, ForeignKey("games.game_id"), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc)
    )
    user: Mapped["User"] = relationship(back_populates="ratings")
    game: Mapped["Game"] = relationship(back_populates="ratings")


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
    photo_url: Mapped[Optional[str]] = mapped_column(String(200), default="/static/photos/default.jpg")
    purchases: Mapped[List["Purchase"]] = relationship(back_populates="user")
    messages: Mapped[List["Message"]] = relationship(back_populates="user")
    ratings: Mapped[List["Rating"]] = relationship(back_populates="user")


class Game(Base):
    """Modèle pour les jeux"""
    __tablename__ = "games"

    game_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    release_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    publisher: Mapped[str] = mapped_column(String(100))
    category: Mapped[str] = mapped_column(String(50))
    platforms: Mapped[str] = mapped_column(String(100))
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    image: Mapped[str] = mapped_column(String(200), default="#333")

    purchases: Mapped[List["Purchase"]] = relationship(back_populates="game")
    messages: Mapped[List["Message"]] = relationship(back_populates="game")
    ratings: Mapped[List["Rating"]] = relationship(back_populates="game")


class Purchase(Base):
    __tablename__ = "purchases"

    purchase_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"))  # 'users' avec 's'
    game_id: Mapped[int] = mapped_column(ForeignKey("games.game_id"))  # 'games' avec 's'
    user: Mapped["User"] = relationship(back_populates="purchases")
    game: Mapped["Game"] = relationship(back_populates="purchases")
    price: Mapped[float] = mapped_column(Float, default=0.0)


class Message(Base):
    __tablename__ = "messages"

    message_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)  # 'users' avec 's'
    game_id: Mapped[int] = mapped_column(ForeignKey("games.game_id"), nullable=False)  # 'games' avec 's'
    content: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    user: Mapped["User"] = relationship(back_populates="messages")
    game: Mapped["Game"] = relationship(back_populates="messages")

# Configuration de la base de données
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, "game_store.db")
DATABASE_URL = f"sqlite:///{db_path}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
