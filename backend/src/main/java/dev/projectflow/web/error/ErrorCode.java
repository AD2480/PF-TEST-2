package dev.projectflow.web.error;

/** Machine-readable error codes; the frontend branches on these, not on messages. */
public enum ErrorCode {
    VALIDATION_FAILED,
    UNAUTHORIZED,
    FORBIDDEN,
    NOT_FOUND,
    CONFLICT,
    WORKFLOW_VIOLATION,
    EDIT_CONFLICT,
    /** AI assistance isn't configured on this server, or the per-user limit was reached. */
    AI_UNAVAILABLE,
    /** The AI provider failed or returned something unusable. */
    AI_FAILED,
    /** Too many attempts from this address or for this account; try again later. */
    RATE_LIMITED,
    /** The account exists, but its email address hasn't been confirmed yet. */
    EMAIL_NOT_VERIFIED,
    /** A link from an email is invalid, used or expired. */
    LINK_EXPIRED,
    /** A feature needs something the server doesn't have configured (e.g. email). */
    NOT_AVAILABLE,
    INTERNAL_ERROR
}
