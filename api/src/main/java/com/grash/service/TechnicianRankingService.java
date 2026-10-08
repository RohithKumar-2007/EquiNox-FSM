package com.grash.service;

import com.grash.model.Location;
import com.grash.model.User;
import com.grash.model.WorkOrder;
import com.grash.model.enums.Priority;
import com.grash.model.enums.RoleCode;
import com.grash.model.enums.Status;
import com.grash.repository.UserRepository;
import com.grash.repository.WorkOrderRepository;
import com.grash.utils.Helper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TechnicianRankingService {

    private final UserRepository userRepository;
    private final WorkOrderRepository workOrderRepository;
    private final WorkloadService workloadService;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RankedCandidate {
        private User user;
        private double totalScore;
        private double skillScore;
        private double availabilityScore;
        private double workloadScore;
        private double locationScore;
        private double slaUrgencyScore;
        private String reason;
    }

    public List<RankedCandidate> rankReplacementTechnicians(WorkOrder workOrder, Set<Long> excludedUserIds) {
        if (workOrder == null || workOrder.getCompany() == null) {
            return Collections.emptyList();
        }

        Long companyId = workOrder.getCompany().getId();
        Collection<User> companyUsers = userRepository.findByCompany_Id(companyId);

        List<User> eligibleTechnicians = companyUsers.stream()
                .filter(User::isEnabled)
                .filter(u -> isTechnicianRole(u))
                .filter(u -> excludedUserIds == null || !excludedUserIds.contains(u.getId()))
                .filter(u -> workOrder.getPrimaryUser() == null || !u.getId().equals(workOrder.getPrimaryUser().getId()))
                .collect(Collectors.toList());

        if (eligibleTechnicians.isEmpty()) {
            return Collections.emptyList();
        }

        LocalDate targetDate = workOrder.getEstimatedStartDate() != null
                ? Helper.dateToLocalDate(workOrder.getEstimatedStartDate())
                : (workOrder.getDueDate() != null ? Helper.dateToLocalDate(workOrder.getDueDate()) : LocalDate.now());

        List<RankedCandidate> candidates = new ArrayList<>();

        for (User technician : eligibleTechnicians) {
            double skillScore = calculateSkillScore(technician, workOrder);
            double availabilityScore = calculateAvailabilityScore(technician, targetDate, workOrder);
            double workloadScore = calculateWorkloadScore(technician);
            double locationScore = calculateLocationScore(technician, workOrder);
            double slaUrgencyScore = calculateSlaUrgencyScore(workOrder);

            double totalScore = skillScore + availabilityScore + workloadScore + locationScore + slaUrgencyScore;

            String reason = String.format("Score: %.1f [Skill: %.0f, Avail: %.0f, Workload: %.0f, Location: %.0f, Urgency: %.0f]",
                    totalScore, skillScore, availabilityScore, workloadScore, locationScore, slaUrgencyScore);

            candidates.add(RankedCandidate.builder()
                    .user(technician)
                    .totalScore(totalScore)
                    .skillScore(skillScore)
                    .availabilityScore(availabilityScore)
                    .workloadScore(workloadScore)
                    .locationScore(locationScore)
                    .slaUrgencyScore(slaUrgencyScore)
                    .reason(reason)
                    .build());
        }

        candidates.sort((a, b) -> Double.compare(b.getTotalScore(), a.getTotalScore()));
        return candidates;
    }

    public Optional<User> findBestReplacementTechnician(WorkOrder workOrder, Set<Long> excludedUserIds) {
        List<RankedCandidate> candidates = rankReplacementTechnicians(workOrder, excludedUserIds);
        return candidates.stream().findFirst().map(RankedCandidate::getUser);
    }

    private boolean isTechnicianRole(User user) {
        if (user.getRole() == null) return false;
        RoleCode code = user.getRole().getCode();
        return code == RoleCode.TECHNICIAN || code == RoleCode.LIMITED_TECHNICIAN || code == RoleCode.ADMIN;
    }

    private double calculateSkillScore(User user, WorkOrder workOrder) {
        double score = 10.0; // Base score
        String jobTitle = user.getJobTitle();
        if (jobTitle != null && !jobTitle.isBlank()) {
            String titleLower = jobTitle.toLowerCase();
            String woTitle = workOrder.getTitle() != null ? workOrder.getTitle().toLowerCase() : "";
            String woDesc = workOrder.getDescription() != null ? workOrder.getDescription().toLowerCase() : "";
            String category = workOrder.getCategory() != null && workOrder.getCategory().getName() != null
                    ? workOrder.getCategory().getName().toLowerCase() : "";

            if (!category.isEmpty() && (titleLower.contains(category) || category.contains(titleLower))) {
                score += 15.0;
            } else if (woTitle.contains(titleLower) || woDesc.contains(titleLower)) {
                score += 12.0;
            } else {
                score += 5.0;
            }
        }
        return Math.min(30.0, score);
    }

    private double calculateAvailabilityScore(User user, LocalDate date, WorkOrder workOrder) {
        int capacityMinutes = workloadService.getUserCapacityForDay(user, date);
        if (user.getShiftConfiguration() == null) {
            return 18.0; // Default capacity assumption if no shifts are defined
        }
        if (capacityMinutes <= 0) {
            return 0.0; // Off duty or leave exception
        }
        double estimatedMinutes = workOrder.getEstimatedDuration() > 0 ? workOrder.getEstimatedDuration() * 60 : 60;
        if (capacityMinutes >= estimatedMinutes) {
            return 25.0;
        }
        return Math.max(5.0, 25.0 * (capacityMinutes / estimatedMinutes));
    }

    private double calculateWorkloadScore(User user) {
        Collection<WorkOrder> assignedWOs = workOrderRepository.findByAssignedToUser(user.getId());
        long activeCount = assignedWOs.stream()
                .filter(wo -> wo.getStatus() != null && wo.getStatus() != Status.COMPLETE)
                .count();

        // 0 active = 25 pts, 1 active = 20 pts, 2 active = 15 pts, 3 active = 10 pts, etc.
        double score = 25.0 - (activeCount * 4.0);
        return Math.max(2.0, score);
    }

    private double calculateLocationScore(User user, WorkOrder workOrder) {
        Location userLoc = user.getLocation();
        Location woLoc = workOrder.getLocation();

        if (userLoc == null || woLoc == null) {
            return 8.0; // Moderate neutral score
        }

        if (userLoc.getId() != null && userLoc.getId().equals(woLoc.getId())) {
            return 15.0; // Same facility / location
        }

        if (userLoc.getLatitude() != null && userLoc.getLongitude() != null
                && woLoc.getLatitude() != null && woLoc.getLongitude() != null) {
            double distanceKm = calculateHaversine(
                    userLoc.getLatitude(), userLoc.getLongitude(),
                    woLoc.getLatitude(), woLoc.getLongitude()
            );
            if (distanceKm <= 5.0) return 14.0;
            if (distanceKm <= 20.0) return 10.0;
            if (distanceKm <= 50.0) return 6.0;
            return 2.0;
        }

        return 8.0;
    }

    private double calculateSlaUrgencyScore(WorkOrder workOrder) {
        Priority priority = workOrder.getPriority();
        if (priority == null) return 3.0;
        switch (priority) {
            case HIGH:
                return 10.0;
            case MEDIUM:
                return 6.0;
            case LOW:
                return 4.0;
            case NONE:
            default:
                return 2.0;
        }
    }

    private double calculateHaversine(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of Earth in KM
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
