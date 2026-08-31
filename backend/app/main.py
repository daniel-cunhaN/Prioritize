from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import auth

app = FastAPI(title="Wishlist Centralizer API")

# Configure CORS for local development / Expo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Wishlist Centralizer API"}
