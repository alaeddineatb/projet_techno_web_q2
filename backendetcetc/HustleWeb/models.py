import sqlalchemy
import datetime
from sqlalchemy.orm import session, declarative_base
from pydantic import BaseModel
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from sqlalchemy import create_engine, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Session




DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)


Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    user_id:Mapped[int] = mapped_column(primary_key=True)
    User:Mapped[str] = mapped_column(String(30))
    email:Mapped[str] = mapped_column(String(254))
    MotDePasse:Mapped[str] = mapped_column(String(32)) 
    created_at:Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True)) 
    is_admin:Mapped[bool] 
    is_banned:Mapped[bool] 
    last_login:Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True)) 

class Game(Base):
    __tablename__ = "games"
    game_id:Mapped[int] = mapped_column(Integer, primary_key=True)
    title:Mapped[str] = mapped_column(String(100))
    description:Mapped[str]
    price:Mapped[float]
    release_date:Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))
    publisher:Mapped[str] = mapped_column(String(100))
    category:Mapped[str] = mapped_column(String(50))
    rating_avg:Mapped[float] 

class Purchase(Base):
    __tablename__ = "purchases"
    purchase_id:Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id:Mapped[int] 
    game_id:Mapped[int] = mapped_column(Integer, ForeignKey("games.game_id"))
    purchase_date = mapped_column(DateTime, default=datetime.utcnow)
    price:Mapped[float] 
    status:Mapped[str] = mapped_column(String(20))

class Message(Base):
        __tablename__ = "messages"
        message_id:Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        user_msg:Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
        game_forum:Mapped[str] = mapped_column(String(20)) 
        created_at:Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True)) 
    


Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = Session()



def create_database():
    Base.metadata.create_all(engine)




