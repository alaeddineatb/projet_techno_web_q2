from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class GameCreate(BaseModel):
    title: str
    price: float
    description: str