FROM python:3.11-slim

WORKDIR /app

# OS deps
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

# Copy requirements early
COPY requirements.txt .

# Install Ultralytics prerequisites
RUN pip install --no-cache-dir --upgrade pip wheel setuptools

# Install PyTorch **CPU ONLY**
RUN pip install --no-cache-dir \
    torch==2.2.0+cpu \
    torchvision==0.17.0+cpu \
    torchaudio==2.2.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install the rest
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "conveyor_backend.asgi:application"]
