"""
Modèles de base de données SQLAlchemy pour Game Store

Architecture de données:
- ORM SQLAlchemy avec annotations de type (Mapped)
- Relations bidirectionnelles entre entités
- Timestamps UTC pour cohérence globale
- Contraintes d'intégrité référentielle

Tables principales:
- User: Utilisateurs avec rôles et statuts
- Game: Catalogue de jeux avec métadonnées
- Purchase: Historique d'achats (relation M2M User-Game)
- Message: Chat par jeu
- Rating: Notes des jeux (relation M2M User-Game)

Fonctionnalités:
- Authentification par username/email + password hashé
- Système de permissions (admin/user) et bannissement
- Chat séparé par jeu (seuls propriétaires peuvent poster)
- Système de notation avec moyenne dénormalisée
- Historique d'achats avec prix au moment de l'achat
"""
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import create_engine, String, Integer, DateTime, ForeignKey, Float, Boolean, Text
from sqlalchemy.orm import relationship, declarative_base, Mapped, mapped_column, sessionmaker
import os

Base = declarative_base()

# ================== MODÈLE RATING ==================
class Rating(Base):
   """
   Table des évaluations de jeux par les utilisateurs
   - Notes de 1 à 5 étoiles par couple (user, game)
   - Relations Many-to-One avec User et Game
   """
   __tablename__ = "ratings"
   
   rating_id: Mapped[int] = mapped_column(Integer, primary_key=True)
   user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.user_id"), nullable=False)
   game_id: Mapped[int] = mapped_column(Integer, ForeignKey("games.game_id"), nullable=False)
   value: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
   created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
   
   # Relations bidirectionnelles
   user: Mapped["User"] = relationship(back_populates="ratings")
   game: Mapped["Game"] = relationship(back_populates="ratings")

# ================== MODÈLE USER ==================
class User(Base):
   """
   Table des utilisateurs du système
   - Authentification par username/email + password hashé (bcrypt)
   - Gestion rôles (admin/user) et bannissement
   - Relations avec achats, messages et notes
   """
   __tablename__ = "users"

   user_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
   email: Mapped[str] = mapped_column(String(254), unique=True, index=True)  # RFC 5321
   username: Mapped[str] = mapped_column(String(30), unique=True, index=True)
   hashed_password: Mapped[str] = mapped_column(String(60), nullable=False)  # bcrypt = 60 chars
   created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
   
   # Flags permissions et statut
   is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
   is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
   
   # Tracking et profil
   last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
   photo_url: Mapped[Optional[str]] = mapped_column(String(200), default="/static/photos/default.jpg")
   
   # Relations One-to-Many
   purchases: Mapped[List["Purchase"]] = relationship(back_populates="user", cascade="all, delete-orphan")
   messages: Mapped[List["Message"]] = relationship(back_populates="user", cascade="all, delete-orphan")
   ratings: Mapped[List["Rating"]] = relationship(back_populates="user", cascade="all, delete-orphan")

# ================== MODÈLE GAME ==================
class Game(Base):
   """
   Table du catalogue de jeux
   - Métadonnées complètes avec support multi-plateforme
   - Note moyenne dénormalisée pour performances
   - Relations avec achats, messages et notes
   """
   __tablename__ = "games"

   game_id: Mapped[int] = mapped_column(Integer, primary_key=True)
   title: Mapped[str] = mapped_column(String(100), nullable=False)
   description: Mapped[str] = mapped_column(Text)
   price: Mapped[float] = mapped_column(Float, nullable=False)
   release_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
   
   # Métadonnées
   publisher: Mapped[str] = mapped_column(String(100))
   category: Mapped[str] = mapped_column(String(50))  # RPG, Strategy, etc.
   platforms: Mapped[str] = mapped_column(String(100))  # CSV: "PC,PlayStation,Xbox"
   
   # Note moyenne dénormalisée (recalculée après chaque note)
   rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
   image: Mapped[str] = mapped_column(String(200), default="#333")  # URL ou couleur

   # Relations One-to-Many
   purchases: Mapped[List["Purchase"]] = relationship(back_populates="game")
   messages: Mapped[List["Message"]] = relationship(back_populates="game", cascade="all, delete-orphan")
   ratings: Mapped[List["Rating"]] = relationship(back_populates="game", cascade="all, delete-orphan")

# ================== MODÈLE PURCHASE ==================
class Purchase(Base):
   """
   Table des achats (relation Many-to-Many User <-> Game)
   - Prix historique au moment de l'achat
   - Vérification propriété pour features (chat, rating)
   """
   __tablename__ = "purchases"

   purchase_id: Mapped[int] = mapped_column(primary_key=True)
   user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"))
   game_id: Mapped[int] = mapped_column(ForeignKey("games.game_id"))
   price: Mapped[float] = mapped_column(Float, default=0.0)  # Prix historique
   purchase_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
   
   # Relations bidirectionnelles
   user: Mapped["User"] = relationship(back_populates="purchases")
   game: Mapped["Game"] = relationship(back_populates="purchases")

# ================== MODÈLE MESSAGE ==================
class Message(Base):
   """
   Table des messages de chat par jeu
   - Chat séparé pour chaque jeu
   - Seuls les propriétaires du jeu peuvent poster
   - Ordre chronologique par created_at
   """
   __tablename__ = "messages"

   message_id: Mapped[int] = mapped_column(Integer, primary_key=True)
   user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id"), nullable=False)
   game_id: Mapped[int] = mapped_column(ForeignKey("games.game_id"), nullable=False)
   content: Mapped[str]  # Contenu du message (max 500 chars validé côté app)
   created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
   
   # Relations pour eager loading
   user: Mapped["User"] = relationship(back_populates="messages")
   game: Mapped["Game"] = relationship(back_populates="messages")

# ================== CONFIGURATION BASE DE DONNÉES ==================

# Configuration SQLite avec chemin absolu
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, "game_store.db")
DATABASE_URL = f"sqlite:///{db_path}"

# Moteur SQLAlchemy
engine = create_engine(
   DATABASE_URL,
   connect_args={"check_same_thread": False}  # Nécessaire SQLite + threads
)

# Factory de sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)