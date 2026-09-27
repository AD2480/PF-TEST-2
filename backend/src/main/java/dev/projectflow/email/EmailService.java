package dev.projectflow.email;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import dev.projectflow.config.AppProperties;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Sends account emails in the background, so a slow mail provider never slows down sign-in.
 *
 * <ul>
 *   <li>{@code none}: nothing is sent (the app says so where it matters, e.g. password reset);</li>
 *   <li>{@code log}: the email is written to the server log (local testing: copy the link);</li>
 *   <li>{@code resend}: sent through Resend's HTTPS API. Hosts such as Railway block SMTP, so
 *       an HTTPS API is the dependable choice.</li>
 * </ul>
 */
@Service
public class EmailService implements DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final String provider;
    private final String apiKey;
    private final String from;
    private final String replyTo;
    private final String apiUrl;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ThreadPoolExecutor executor = new ThreadPoolExecutor(1, 2, 60, TimeUnit.SECONDS, new ArrayBlockingQueue<>(500), r -> {
        Thread t = new Thread(r, "projectflow-email");
        t.setDaemon(true);
        return t;
    });

    public EmailService(AppProperties props, ObjectMapper json) {
        AppProperties.Email e = props.email();
        this.provider = e == null ? "none" : e.providerOrNone();
        this.apiKey = e == null || e.apiKey() == null ? "" : e.apiKey().trim();
        this.from = e == null || e.from() == null || e.from().isBlank() ? "ProjectFlow <onboarding@resend.dev>" : e.from().trim();
        this.replyTo = e == null || e.replyTo() == null ? "" : e.replyTo().trim();
        this.apiUrl = e == null || e.apiUrl() == null || e.apiUrl().isBlank() ? "https://api.resend.com/emails" : e.apiUrl().trim();
        this.json = json;
        if ("resend".equals(provider) && apiKey.isEmpty()) {
            throw new IllegalStateException("EMAIL_PROVIDER=resend needs EMAIL_API_KEY (a Resend API key, starting with re_).");
        }
        if (!"none".equals(provider) && !"log".equals(provider) && !"resend".equals(provider)) {
            throw new IllegalStateException("EMAIL_PROVIDER must be none, log or resend (was: " + provider + ").");
        }
        log.info("Email: {}", switch (provider) {
            case "resend" -> "sent through Resend from " + from;
            case "log" -> "written to this log, not sent (EMAIL_PROVIDER=log)";
            default -> "off (EMAIL_PROVIDER=none)";
        });
    }

    /** True when emails actually reach people's inboxes. */
    public boolean delivers() {
        return "resend".equals(provider);
    }

    /** True when emails are produced at all (delivered, or written to the log for testing). */
    public boolean enabled() {
        return !"none".equals(provider);
    }

    /**
     * Queues an email. Inside a transaction it waits for the commit, so a link never arrives before
     * the record it points to exists. Failures are logged, never thrown: an email can't undo a sign-in.
     */
    public void send(EmailMessage m) {
        if (!enabled()) return;
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    enqueue(m);
                }
            });
        } else {
            enqueue(m);
        }
    }

    private void enqueue(EmailMessage m) {
        try {
            executor.execute(() -> deliver(m));
        } catch (RuntimeException full) {
            log.warn("Email queue is full; dropped \"{}\" to {}", m.subject(), mask(m.to()));
        }
    }

    void deliver(EmailMessage m) {
        if ("log".equals(provider)) {
            log.info("EMAIL (not sent, EMAIL_PROVIDER=log)\nTo: {}\nSubject: {}\n\n{}", m.to(), m.subject(), m.text());
            return;
        }
        try {
            ObjectNode body = json.createObjectNode();
            body.put("from", from);
            body.putArray("to").add(m.to());
            body.put("subject", m.subject());
            body.put("text", m.text());
            body.put("html", m.html());
            if (!replyTo.isEmpty()) body.put("reply_to", replyTo);
            HttpResponse<String> res = http.send(
                    HttpRequest.newBuilder(URI.create(apiUrl))
                            .timeout(Duration.ofSeconds(20))
                            .header("Authorization", "Bearer " + apiKey)
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                            .build(),
                    HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() / 100 == 2) {
                log.info("Email \"{}\" sent to {}", m.subject(), mask(m.to()));
            } else {
                // The provider's message says what's wrong (unverified domain, bad key…); it holds no secrets.
                log.warn("Email \"{}\" to {} was refused ({}): {}", m.subject(), mask(m.to()), res.statusCode(), abbreviate(res.body()));
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.warn("Email \"{}\" to {} failed: {}", m.subject(), mask(m.to()), e.toString());
        }
    }

    /** a***@example.com: enough to recognise in logs without writing out addresses. */
    static String mask(String email) {
        int at = email == null ? -1 : email.indexOf('@');
        if (at <= 0) return "(hidden)";
        return email.charAt(0) + "***" + email.substring(at);
    }

    private static String abbreviate(String s) {
        return s == null ? "" : s.length() > 300 ? s.substring(0, 300) + "…" : s;
    }

    /** Lets queued emails finish (up to 10 seconds) when the server stops. */
    @Override
    public void destroy() throws InterruptedException {
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);
    }
}
