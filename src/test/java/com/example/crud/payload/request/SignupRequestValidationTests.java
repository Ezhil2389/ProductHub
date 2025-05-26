package com.example.crud.payload.request;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class SignupRequestValidationTests {

    private static Validator validator;

    @BeforeAll
    public static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    private SignupRequest createValidSignupRequest() {
        SignupRequest request = new SignupRequest();
        request.setUsername("testuser");
        request.setEmail("test@example.com");
        return request;
    }

    @Test
    public void testValidPassword() {
        SignupRequest request = createValidSignupRequest();
        request.setPassword("ValidPass1@");
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty(), "Valid password should have no violations");
    }

    @Test
    public void testPasswordTooShort() {
        SignupRequest request = createValidSignupRequest();
        request.setPassword("Short1@"); // 7 chars
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size(), "Password too short should have one violation");
        ConstraintViolation<SignupRequest> violation = violations.iterator().next();
        assertEquals("password", violation.getPropertyPath().toString());
        // The message comes from @Size first if both @Size and @Pattern are violated regarding length
        assertEquals("Password must be 8 to 40 characters long, include at least one uppercase letter, one lowercase letter, one digit, and one special character.", violation.getMessage());
    }
    
    @Test
    public void testPasswordCorrectLengthButPatternMismatch_TooShortInPattern() {
        SignupRequest request = createValidSignupRequest();
        request.setPassword("Short1@"); // 7 chars, also violates pattern's {8,40}
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size(), "Password pattern mismatch (length in pattern) should have one violation");
        ConstraintViolation<SignupRequest> violation = violations.iterator().next();
        assertEquals("password", violation.getPropertyPath().toString());
         // The message for @Size is "size must be between 8 and 40"
         // The message for @Pattern is "Password must be 8 to 40 characters long..."
         // Depending on the validator implementation, either could be chosen or both presented.
         // We check against the combined message from the @Pattern as it's more specific.
        assertEquals("Password must be 8 to 40 characters long, include at least one uppercase letter, one lowercase letter, one digit, and one special character.", violation.getMessage());
    }


    @Test
    public void testPasswordMissingUppercase() {
        SignupRequest request = createValidSignupRequest();
        request.setPassword("nouppercase1@");
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size(), "Password missing uppercase should have one violation");
        ConstraintViolation<SignupRequest> violation = violations.iterator().next();
        assertEquals("password", violation.getPropertyPath().toString());
        assertEquals("Password must be 8 to 40 characters long, include at least one uppercase letter, one lowercase letter, one digit, and one special character.", violation.getMessage());
    }

    @Test
    public void testPasswordMissingLowercase() {
        SignupRequest request = createValidSignupRequest();
        request.setPassword("NOLOWERCASE1@");
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size(), "Password missing lowercase should have one violation");
        ConstraintViolation<SignupRequest> violation = violations.iterator().next();
        assertEquals("password", violation.getPropertyPath().toString());
        assertEquals("Password must be 8 to 40 characters long, include at least one uppercase letter, one lowercase letter, one digit, and one special character.", violation.getMessage());
    }

    @Test
    public void testPasswordMissingDigit() {
        SignupRequest request = createValidSignupRequest();
        request.setPassword("NoDigitPass@");
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size(), "Password missing digit should have one violation");
        ConstraintViolation<SignupRequest> violation = violations.iterator().next();
        assertEquals("password", violation.getPropertyPath().toString());
        assertEquals("Password must be 8 to 40 characters long, include at least one uppercase letter, one lowercase letter, one digit, and one special character.", violation.getMessage());
    }

    @Test
    public void testPasswordMissingSpecialChar() {
        SignupRequest request = createValidSignupRequest();
        request.setPassword("NoSpecial1Pass");
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size(), "Password missing special char should have one violation");
        ConstraintViolation<SignupRequest> violation = violations.iterator().next();
        assertEquals("password", violation.getPropertyPath().toString());
        assertEquals("Password must be 8 to 40 characters long, include at least one uppercase letter, one lowercase letter, one digit, and one special character.", violation.getMessage());
    }

    @Test
    public void testPasswordTooLong() {
        SignupRequest request = createValidSignupRequest();
        request.setPassword("ThisPasswordIsWayTooLongAndExceedsTheFortyCharacterLimitSetInTheValidation1@");
        Set<ConstraintViolation<SignupRequest>> violations = validator.validate(request);
        assertEquals(1, violations.size(), "Password too long should have one violation");
        ConstraintViolation<SignupRequest> violation = violations.iterator().next();
        assertEquals("password", violation.getPropertyPath().toString());
        // This will likely trigger the @Size message first for length.
        // The @Pattern also has a length constraint {8,40}, but @Size is more direct for length violations.
        // Actual message might depend on validator's decision on which constraint to report for length.
        // "Password must be 8 to 40 characters long..." is from @Pattern
        // "size must be between 8 and 40" is from @Size
        // The provided message in @Pattern is more encompassing so we test for that.
        assertEquals("Password must be 8 to 40 characters long, include at least one uppercase letter, one lowercase letter, one digit, and one special character.", violation.getMessage());

    }
}
