from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, LoginResponse,
    TokenResponse, UserResponse, UpdateProfileRequest
)
from app.core.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        currency=user.currency,
        fy_start=user.fy_start,
        plan=user.plan,
        notifications=user.notifications,
        created_at=user.created_at,
    )


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    existing = await User.find_one(User.email == body.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        full_name=body.full_name,
    )
    await user.insert()

    token = create_access_token(subject=user.email)
    return LoginResponse(access_token=token, user=_user_response(user))


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    user = await User.find_one(User.email == body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(subject=user.email)
    return LoginResponse(access_token=token, user=_user_response(user))


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return _user_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(body: UpdateProfileRequest, current_user: User = Depends(get_current_user)):
    update_data = body.model_dump(exclude_none=True)
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc)
        await current_user.set(update_data)
    return _user_response(current_user)
