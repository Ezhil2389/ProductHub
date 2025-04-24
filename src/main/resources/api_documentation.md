# Password Reset and MFA API Documentation

## Password Reset Endpoints

### 1. Initiate Password Reset
```http
POST /auth/forgot-password/verify
Content-Type: application/json

{
    "username": "your_username"
}
```

**Response:**
```json
{
    "userId": 123,
    "mfaEnabled": true,
    "tempToken": "eyJhbGciOiJIUzI1..."
}
```

### 2. Verify MFA (if enabled)
```http
POST /auth/forgot-password/mfa/verify
Authorization: Bearer <tempToken>
Content-Type: application/json

"123456"  // MFA code or recovery code
```

**Response:**
```json
{
    "message": "MFA verification successful"
}
```

### 3. Reset Password
```http
POST /auth/forgot-password/reset
Authorization: Bearer <tempToken>
Content-Type: application/json

{
    "userId": 123,
    "newPassword": "your_new_password"
}
```

**Response:**
```json
{
    "message": "Password has been reset successfully"
}
```

### 4. Change Password (for authenticated users)
```http
PUT /users/{userId}/password
Content-Type: application/json

{
    "currentPassword": "your_current_password",
    "newPassword": "your_new_password"
}
```

**Response:**
```json
{
    "message": "Password updated successfully"
}
```

## MFA Setup and Management

### 1. Initialize MFA Setup
```http
POST /auth/mfa/setup
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
    "secretKey": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": "otpauth://totp/CRUD%20App:username?secret=JBSWY3DPEHPK3PXP&issuer=CRUD%20App",
    "recoveryCodes": null
}
```

### 2. Verify and Enable MFA
```http
POST /auth/mfa/verify
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
    "code": 123456
}
```

**Response:**
```json
{
    "secretKey": "JBSWY3DPEHPK3PXP",
    "qrCodeUrl": null,
    "recoveryCodes": [
        "123456789012",
        "234567890123",
        // ... (10 recovery codes total)
    ]
}
```

### 3. Disable MFA
```http
POST /auth/mfa/disable
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
    "code": 123456
}
```

**Response:**
```json
{
    "message": "MFA disabled successfully"
}
```

## Important Notes

1. **Password Reset Token:**
   - Valid for 15 minutes
   - Single-use only
   - Must be included in the Authorization header as `Bearer <token>`

2. **MFA Codes:**
   - 6-digit TOTP codes
   - Generated using Google Authenticator compatible apps
   - Recovery codes are 12-digit numbers
   - Each recovery code can be used only once

3. **Security Considerations:**
   - All passwords must meet minimum security requirements
   - MFA setup requires authentication
   - Recovery codes should be stored securely
   - Password reset links are sent to registered email addresses

4. **Error Responses:**
   - Invalid credentials: HTTP 400 Bad Request
   - Expired tokens: HTTP 400 Bad Request
   - Invalid MFA codes: HTTP 400 Bad Request
   - Unauthorized access: HTTP 401 Unauthorized 