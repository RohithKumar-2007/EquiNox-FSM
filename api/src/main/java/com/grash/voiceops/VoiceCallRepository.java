package com.grash.voiceops;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VoiceCallRepository extends JpaRepository<VoiceCall, Long> {
    Optional<VoiceCall> findByConversationId(String conversationId);

    List<VoiceCall> findByCompanyIdOrderByStartedAtDesc(Long companyId, Pageable pageable);
}
