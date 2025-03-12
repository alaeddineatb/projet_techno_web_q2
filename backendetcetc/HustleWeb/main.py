from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn
# Création de l'application
router = FastAPI()


templates = Jinja2Templates(directory="templates")
router.mount("/static", StaticFiles(directory="static"), name="static")
router.mount("/templates", StaticFiles(directory="templates"), name="templates")


from views import *  
from post import * 


if __name__ == "__main__":
    uvicorn.run(router, host="0.0.0.0", port=8000)