# ---- Stage 1: Build the application ----
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
# Copy only pom.xml first to leverage Docker cache for dependencies
COPY pom.xml .
RUN mvn dependency:go-offline
# Now copy the rest of the source
COPY src ./src
RUN mvn clean package -DskipTests

# ---- Stage 2: Run the application ----
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Create data directory for H2 persistence
RUN mkdir -p /app/data
VOLUME ["/app/data"]
# Expose default Spring Boot port
EXPOSE 8080
# Set default profile to dev, allow override
ENV SPRING_PROFILES_ACTIVE=dev
CMD ["java", "-jar", "app.jar"] 