package dev.projectflow.repository;

import dev.projectflow.domain.Notification;
import dev.projectflow.domain.NotificationType;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @EntityGraph(attributePaths = "actor")
    List<Notification> findByUserIdOrderByCreatedAtDescIdDesc(Long userId);

    long countByUserIdAndReadFalse(Long userId);

    List<Notification> findByUserIdAndReadFalse(Long userId);

    List<Notification> findByInvitationId(Long invitationId);

    List<Notification> findByTypeAndLink(NotificationType type, String link);

    void deleteByLink(String link);
}
