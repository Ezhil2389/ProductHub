# CRUD Application

## Environment Profiles

This application has been configured with distinct environments for development, testing, and production. Each environment has its own configuration properties.

### Available Profiles

- **dev**: Development environment (default)
- **test**: Testing environment
- **prod**: Production environment

### How to Use Profiles

#### Running with specific profile in Maven

```shell
# Run with dev profile (default)
mvn spring-boot:run

# Run with test profile
mvn spring-boot:run -Dspring-boot.run.profiles=test

# Run with prod profile
mvn spring-boot:run -Dspring-boot.run.profiles=prod
```

#### Setting profile via environment variable

```shell
# Linux/macOS
export SPRING_PROFILES_ACTIVE=prod
java -jar CRUD-0.0.1-SNAPSHOT.jar

# Windows
set SPRING_PROFILES_ACTIVE=prod
java -jar CRUD-0.0.1-SNAPSHOT.jar
```

#### Setting profile via command line

```shell
java -jar CRUD-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
```

### Environment-Specific Configuration

Each environment has different settings for:

- Database configuration
- Connection pool settings
- JPA/Hibernate properties
- JWT secrets and timeouts
- CORS settings
- Encryption keys
- Logging levels
- Google OAuth2 Configuration

For production, consider:
1. Changing the database to a production-grade database like PostgreSQL or MySQL
2. Using environment variables for sensitive values like JWT_SECRET, DB_PASSWORD, and ENCRYPTION_KEY
3. Setting appropriate CORS allowed origins

## Google Authentication

The application supports authentication via Google OAuth2. To use this feature:

1. Configure your Google OAuth2 credentials in the appropriate properties file:
   ```properties
   google.client.id=your-google-client-id
   google.client.secret=your-google-client-secret
   google.redirect.uri=your-redirect-uri
   ```

2. Endpoints:
   - `/auth/google/signin` - For authenticating existing users with Google
   - `/auth/google/signup` - For registering new users with Google

3. Request format:
   ```json
   {
     "token": "google-id-token-from-client",
     "username": "optional-username-for-signup"
   }
   ```

4. Response format:
   ```json
   {
     "token": "jwt-token",
     "type": "Bearer",
     "username": "user's-username",
     "roles": ["ROLE_USER"]
   }
   ``` 