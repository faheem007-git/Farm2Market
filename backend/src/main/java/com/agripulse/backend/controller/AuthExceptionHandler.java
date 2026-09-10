package com.agripulse.backend.controller;

import com.agripulse.backend.security.AuthFailedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/** Bad credentials -> 401 JSON instead of a 500 with a stack trace. */
@RestControllerAdvice
public class AuthExceptionHandler {

    @ExceptionHandler(AuthFailedException.class)
    public ResponseEntity<Map<String, String>> handleAuthFailed(AuthFailedException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Unauthorized", "message", e.getMessage()));
    }
}
