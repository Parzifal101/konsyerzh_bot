from fastapi import FastAPI

app = FastAPI()


@app.get("/image")
def read_root():
    return {"Hello": "Image"}