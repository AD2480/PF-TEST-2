package dev.projectflow.web.error;

import java.time.Instant;
import java.util.Map;

/** Error envelope: {@code { success:false, status, code, error, message, fieldErrors, path, timestamp }}. */
public record ApiErrorBody(
        boolean success,
        int status,
        ErrorCode code,
        String error,
        String message,
        Map<String, String> fieldErrors,
        String path,
        Instant timestamp) {

    public static ApiErrorBody of(int status, ErrorCode code, String error, String message, Map<String, String> fieldErrors, String path) {
        return new ApiErrorBody(false, status, code, error, message, fieldErrors, path, Instant.now());
    }
}
