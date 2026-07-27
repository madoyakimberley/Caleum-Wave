FROM node:20-slim

# Install system dependencies: python3, ffmpeg, curl, and yt-dlp
RUN apt-get update && apt-get install -y \
    python3 \
    ffmpeg \
    curl \
    && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 👈 ADD THIS LINE: Compiles Next.js into the .next folder
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]