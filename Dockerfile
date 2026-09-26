# Stage 1: Build Frontend (Node.js & Vite)
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
ENV VITE_GOOGLE_MAPS_KEY="AIzaSyCuK2tdlCHHJGXf-JzvhSXOQf5aFckrFtw"
RUN npm run build

# Stage 2: Unified Backend & Frontend Service (Python 3.12 & FastAPI)
FROM python:3.12-slim
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY . .

# Copy built frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 10000

# Start unified server serving API, WebSocket, and Frontend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
