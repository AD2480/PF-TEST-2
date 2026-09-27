package dev.projectflow.ai;

/** A text-completion provider. Implementations hold the API key; nothing here reaches the browser. */
public interface AiClient {

    /** The model's reply to one system + user message pair. Throws {@link AiClientException} on any failure. */
    String complete(String system, String user, int maxTokens);

    class AiClientException extends RuntimeException {
        public AiClientException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
