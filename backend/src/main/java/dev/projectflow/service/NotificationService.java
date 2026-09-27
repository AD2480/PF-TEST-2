package dev.projectflow.service;

import dev.projectflow.domain.Notification;
import dev.projectflow.domain.NotificationType;
import dev.projectflow.domain.User;
import dev.projectflow.repository.NotificationRepository;
import dev.projectflow.security.CurrentUser;
import dev.projectflow.web.PageResponse;
import dev.projectflow.web.dto.Dto;
import dev.projectflow.web.error.ApiException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import dev.projectflow.live.LiveEvents;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Creates notifications for other people and serves the signed-in user's inbox. */
@Service
public class NotificationService {

    private static final Map<String, Set<NotificationType>> CATEGORIES = Map.of(
            "ASSIGNMENTS", Set.of(NotificationType.TASK_ASSIGNED, NotificationType.PLAN_CHANGED),
            "INVITATIONS", Set.of(NotificationType.INVITATION),
            "SUBMISSIONS", Set.of(NotificationType.SUBMISSION),
            "REVIEWS", Set.of(NotificationType.REVIEW_APPROVED, NotificationType.CHANGES_REQUESTED));

    private final NotificationRepository notifications;
    private final DtoMapper mapper;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    public NotificationService(NotificationRepository notifications, DtoMapper mapper, Clock clock, ApplicationEventPublisher events) {
        this.events = events;
        this.notifications = notifications;
        this.mapper = mapper;
        this.clock = clock;
    }

    /** Notify someone about an action; people are never notified about their own actions. */
    public void notify(Long recipientId, User actor, NotificationType type, String title, String message, String link, Long projectId, Long invitationId) {
        if (recipientId == null || (actor != null && Objects.equals(actor.getId(), recipientId))) return;
        Notification n = new Notification();
        n.setUserId(recipientId);
        n.setActor(actor);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message.length() > 1000 ? message.substring(0, 999) + "…" : message);
        n.setLink(link);
        n.setRead(false);
        n.setProjectId(projectId);
        n.setInvitationId(invitationId);
        n.setCreatedAt(Instant.now(clock));
        notifications.save(n);
        events.publishEvent(new LiveEvents.UserNotified(recipientId));
    }

    @Transactional(readOnly = true)
    public PageResponse<Dto.Notification> list(String category, int page, int size) {
        Long me = CurrentUser.id();
        String cat = category == null ? "ALL" : category.toUpperCase();
        List<Notification> all = notifications.findByUserIdOrderByCreatedAtDescIdDesc(me).stream()
                .filter(n -> switch (cat) {
                    case "ALL" -> true;
                    case "UNREAD" -> !n.isRead();
                    default -> CATEGORIES.getOrDefault(cat, Set.of(n.getType())).contains(n.getType());
                })
                .toList();
        return PageResponse.of(all, page, size, mapper::notification);
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return notifications.countByUserIdAndReadFalse(CurrentUser.id());
    }

    private Notification own(Long id) {
        Notification n = notifications.findById(id).orElseThrow(() -> ApiException.notFound("Notification not found."));
        if (!Objects.equals(n.getUserId(), CurrentUser.id())) throw ApiException.notFound("Notification not found.");
        return n;
    }

    @Transactional
    public Dto.Notification markRead(Long id, boolean read) {
        Notification n = own(id);
        n.setRead(read);
        return mapper.notification(n);
    }

    @Transactional
    public int markAllRead() {
        List<Notification> unread = notifications.findByUserIdAndReadFalse(CurrentUser.id());
        unread.forEach(n -> n.setRead(true));
        return unread.size();
    }

    @Transactional
    public void delete(Long id) {
        notifications.delete(own(id));
    }

    /** Mark reviewers' "submitted for review" notifications for a task as handled. */
    public void resolveSubmissionNotifications(String taskLink) {
        notifications.findByTypeAndLink(NotificationType.SUBMISSION, taskLink).forEach(n -> n.setRead(true));
    }
}
