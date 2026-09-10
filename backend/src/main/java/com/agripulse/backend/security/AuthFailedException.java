package com.agripulse.backend.security;

/** Thrown when login credentials are invalid. Mapped to HTTP 401, never 500. */
public class AuthFailedException extends RuntimeException {
    public AuthFailedException() {
        super("Invalid email or password");
    }
}
