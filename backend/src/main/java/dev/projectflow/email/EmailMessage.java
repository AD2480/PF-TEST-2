package dev.projectflow.email;

/** One outgoing email, with a plain-text body and an HTML body saying the same thing. */
public record EmailMessage(String to, String subject, String text, String html) {}
