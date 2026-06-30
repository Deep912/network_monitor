from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from database import get_db
from models import User
from auth import verify_password, create_token
from schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_token(user.username)
    response.set_cookie(
        key="netops_token", value=token, httponly=True, samesite="lax", max_age=86400
    )
    return TokenResponse(access_token=token)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("netops_token")
    return {"message": "Logged out"}


@router.get("/me")
def me(user: str = Depends(__import__("auth").get_current_user)):
    return {"username": user}
