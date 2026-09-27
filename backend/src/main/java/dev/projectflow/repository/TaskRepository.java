package dev.projectflow.repository;

import dev.projectflow.domain.Task;
import dev.projectflow.domain.TaskStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, Long> {
    @EntityGraph(attributePaths = {"assignee", "reporter", "milestone", "project"})
    List<Task> findByProjectId(Long projectId);

    @EntityGraph(attributePaths = {"assignee", "reporter", "milestone", "project"})
    List<Task> findByProjectIdIn(Collection<Long> projectIds);

    List<Task> findByProjectIdAndStatus(Long projectId, TaskStatus status);

    List<Task> findByMilestoneId(Long milestoneId);

    @Query("select t from Task t where t.project.id = :projectId and t.assignee.id = :userId and t.status <> dev.projectflow.domain.TaskStatus.DONE")
    List<Task> findOpenAssigned(@Param("projectId") Long projectId, @Param("userId") Long userId);
}
