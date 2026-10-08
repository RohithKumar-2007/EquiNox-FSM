package com.grash.voiceops;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface VoiceEventRepository extends JpaRepository<VoiceEvent, Long> {
    List<VoiceEvent> findByCallIdInOrderByIdAsc(Collection<Long> callIds);

    boolean existsByCallIdAndType(Long callId, VoiceEvent.Type type);

    boolean existsByCallIdAndOrigin(Long callId, VoiceEvent.Origin origin);
}
