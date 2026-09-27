package dev.projectflow.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Typed view of the {@code projectflow.*} settings in application.yml. */
@ConfigurationProperties(prefix = "projectflow")
public record AppProperties(
        String zone,
        Jwt jwt,
        Cors cors,
        Storage storage,
        DemoData demoData,
        Ai ai,
        Site site,
        Email email,
        Accounts accounts,
        BotProtection botProtection,
        Https https) {

    public record Jwt(String secret, long expirationSeconds) {}

    public record Cors(List<String> allowedOrigins) {}

    public record Storage(String directory) {}

    public record DemoData(boolean enabled) {}

    /** Where the frontend lives, for links in emails (e.g. https://projectflow.vercel.app). */
    public record Site(String url, String name, String contactEmail) {}

    /**
     * Outgoing email. provider = "none" (nothing is sent), "log" (written to the server log, for
     * local testing) or "resend" (sent through Resend's HTTPS API; SMTP isn't used because many
     * hosts block it). The key stays on the server.
     */
    public record Email(String provider, String apiKey, String from, String replyTo, String apiUrl, Boolean signInAlerts) {
        public String providerOrNone() {
            return provider == null || provider.isBlank() ? "none" : provider.trim().toLowerCase();
        }

        public boolean sends() {
            return !"none".equals(providerOrNone());
        }

        /** On unless turned off. */
        public boolean alertsOnSignIn() {
            return signInAlerts == null || signInAlerts;
        }
    }

    /**
     * Sign-up rules. requireEmailVerification = "auto" (on when email is sent through a real
     * provider), "true" or "false".
     */
    public record Accounts(String requireEmailVerification, Boolean registrationOpen) {
        /** Open unless closed. */
        public boolean open() {
            return registrationOpen == null || registrationOpen;
        }
    }

    /**
     * Protection against automated sign-ups and password guessing: per-address rate limits (always
     * on unless disabled for tests) and, optionally, a Cloudflare Turnstile check. trustedProxies is
     * how many proxies in front of the server add to X-Forwarded-For (1 on Railway or Render).
     */
    public record BotProtection(Boolean rateLimits, String turnstileSecret, String turnstileVerifyUrl, Integer trustedProxies) {
        /** On unless turned off (only tests do). */
        public boolean limitsOn() {
            return rateLimits == null || rateLimits;
        }

        /** 1 unless set: one hosting proxy in front of the server. */
        public int proxies() {
            return trustedProxies == null ? 1 : Math.max(0, trustedProxies);
        }

        public boolean turnstile() {
            return turnstileSecret != null && !turnstileSecret.isBlank();
        }
    }

    /** requireHttps: redirect plain-HTTP requests to HTTPS (behind a proxy that sets X-Forwarded-Proto). */
    public record Https(boolean required) {}

    /**
     * Optional AI assistance. provider = "none" (default) or "anthropic". The key stays on the
     * server; the browser never sees it.
     */
    public record Ai(String provider, String apiKey, String model, String baseUrl, int maxRequestsPerHour) {
        public boolean configured() {
            return provider != null && !provider.isBlank() && !"none".equalsIgnoreCase(provider)
                    && apiKey != null && !apiKey.isBlank() && model != null && !model.isBlank();
        }
    }
}
