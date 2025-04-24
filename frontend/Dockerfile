# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app
# Copy only package.json and lock file first for better cache
COPY package*.json ./
RUN npm install
# Now copy the rest of the source
COPY . .
RUN npm run build

# Stage 2: Serve
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.bin ./node_modules/.bin
COPY --from=build /app/node_modules ./node_modules
# Expose Vite preview port
EXPOSE 5173
ENV VITE_API_URL=http://localhost:8080/api
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"] 