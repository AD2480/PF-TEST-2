package dev.projectflow.repository;

import dev.projectflow.domain.StoredFile;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {

    List<StoredFile> findByProjectId(Long projectId);
}
