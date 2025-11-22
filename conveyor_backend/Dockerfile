FROM python:3.12-slim

WORKDIR /app

# Install OS dependencies for OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# -------------------------------
# RUN WITH DAPHNE (WebSockets OK)
# -------------------------------
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "conveyor_backend.asgi:application"]
