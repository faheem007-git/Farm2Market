package com.agripulse.backend.service;

/**
 * Caller is authenticated but does not own the resource. Mapped to HTTP 403
 * via RestExceptionHandler (ResponseEntity, never sendError: sendError would
 * trigger an ERROR dispatch that Spring Security re-authorizes without
 * credentials, overwriting the 403 with a 401).
 */
public class ForbiddenException extends RuntimeException {
    public ForbiddenException(String message) {
        super(message);
    }
}
