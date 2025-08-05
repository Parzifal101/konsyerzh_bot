from fastapi import FastAPI

app = FastAPI()


@app.get("/auth")
def read_root():
    return {"Hello": "Auth!"}