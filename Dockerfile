FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir tensorflow-cpu numpy
# RUN pip install --no-cache-dir tensorflow-cpu -r requirements.txt
CMD ["python", "main.py"]