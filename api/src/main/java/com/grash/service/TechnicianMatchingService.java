package com.grash.service;

import com.grash.dto.assignment.AutoAssignResponseDTO;
import com.grash.dto.assignment.TechnicianCandidateDTO;
import com.grash.exception.CustomException;
import com.grash.model.*;
import com.grash.model.enums.PermissionEntity;
import com.grash.repository.WorkOrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TechnicianMatchingService {

    private final UserService userService;
    private final WorkOrderRepository workOrderRepository;

    @Transactional(readOnly = true)
    public List<TechnicianCandidateDTO> getCandidatesForWorkOrder(WorkOrder workOrder, User currentUser) {
        Company company = currentUser.getCompany();
        Collection<User> companyUsers = userService.findByCompany(company.getId());

        Skill requiredSkill = extractRequiredSkill(workOrder);
        Location woLocation = workOrder.getLocation() != null ? workOrder.getLocation() :
                (workOrder.getAsset() != null ? workOrder.getAsset().getLocation() : null);

        List<TechnicianCandidateDTO> candidates = new ArrayList<>();

        for (User candidateUser : companyUsers) {
            // STEP 2 — ELIGIBILITY FILTERING
            if (!candidateUser.isEnabled() || !candidateUser.isEnabledInSubscription()) {
                continue;
            }

            boolean hasRequiredSkill = true;
            if (requiredSkill != null) {
                hasRequiredSkill = requiredSkill.getUsers() != null &&
                        requiredSkill.getUsers().stream().anyMatch(u -> u.getId().equals(candidateUser.getId()));
            }

            // Reject if technician lacks mandatory required skill
            if (requiredSkill != null && !hasRequiredSkill) {
                continue;
            }

            // Calculate current open work orders
            int openWOs = countOpenWorkOrdersForUser(candidateUser.getId(), company.getId());

            // Check location compatibility
            Location userLoc = candidateUser.getLocation();
            boolean sameLocation = woLocation != null && userLoc != null && woLocation.getId().equals(userLoc.getId());

            // Check shift/availability status
            boolean isAvailable = candidateUser.getShiftConfiguration() == null || candidateUser.getShiftConfiguration().isEnabled();

            // STEP 3 — CANDIDATE SCORING
            List<String> reasons = new ArrayList<>();
            double score = 0.0;

            // 1. Skill Score (Max 35)
            if (requiredSkill != null) {
                score += 35.0;
                reasons.add("Required skill matched: " + requiredSkill.getName());
            } else {
                score += 35.0;
                reasons.add("Satisfies standard technical requirements");
            }

            // 2. Location Score (Max 20)
            if (sameLocation) {
                score += 20.0;
                reasons.add("Registered at same location: " + woLocation.getName());
            } else if (woLocation == null) {
                score += 15.0;
                reasons.add("Work order location unspecified");
            } else if (userLoc == null) {
                score += 10.0;
                reasons.add("General technician pool");
            } else {
                score += 5.0;
                reasons.add("Cross-site technician");
            }

            // 3. Availability Score (Max 20)
            if (isAvailable) {
                score += 20.0;
                reasons.add("On active shift / available");
            } else {
                score += 5.0;
                reasons.add("Shift exception active");
            }

            // 4. Workload Score (Max 15)
            double workloadScore = Math.max(0.0, 15.0 - (openWOs * 2.0));
            score += workloadScore;
            if (openWOs == 0) {
                reasons.add("No current open work orders (0 WOs)");
            } else {
                reasons.add("Active workload: " + openWOs + " open work order(s)");
            }

            // 5. Proximity / Distance Score (Max 10)
            if (sameLocation) {
                score += 10.0;
                reasons.add("Local site proximity");
            } else {
                score += 5.0;
                reasons.add("Regional coverage");
            }

            candidates.add(TechnicianCandidateDTO.builder()
                    .technicianId(candidateUser.getId())
                    .firstName(candidateUser.getFirstName())
                    .lastName(candidateUser.getLastName())
                    .email(candidateUser.getEmail())
                    .score(Math.round(score * 10.0) / 10.0)
                    .skillMatch(hasRequiredSkill)
                    .sameLocation(sameLocation)
                    .available(isAvailable)
                    .openWorkOrderCount(openWOs)
                    .reasons(reasons)
                    .build());
        }

        // Sort descending by score
        candidates.sort(Comparator.comparingDouble(TechnicianCandidateDTO::getScore).reversed());

        // Assign ranks
        for (int i = 0; i < candidates.size(); i++) {
            candidates.get(i).setRank(i + 1);
        }

        return candidates;
    }

    @Transactional
    public AutoAssignResponseDTO autoAssignWorkOrder(WorkOrder workOrder, User currentUser, boolean overwriteExisting) {
        if (!currentUser.getRole().getEditOtherPermissions().contains(PermissionEntity.WORK_ORDERS) &&
                !currentUser.getRole().getViewPermissions().contains(PermissionEntity.SETTINGS)) {
            throw new CustomException("Forbidden", HttpStatus.FORBIDDEN);
        }

        if (workOrder.getPrimaryUser() != null && !overwriteExisting) {
            return AutoAssignResponseDTO.builder()
                    .assigned(false)
                    .workOrderId(workOrder.getId())
                    .message("Work order is already assigned to " + workOrder.getPrimaryUser().getFullName())
                    .requiresConfirmation(true)
                    .build();
        }

        List<TechnicianCandidateDTO> candidates = getCandidatesForWorkOrder(workOrder, currentUser);

        if (candidates.isEmpty()) {
            return AutoAssignResponseDTO.builder()
                    .assigned(false)
                    .workOrderId(workOrder.getId())
                    .message("No eligible technician candidates found satisfying constraints.")
                    .reasons(Collections.singletonList("No active technicians match skill, site, or availability criteria."))
                    .requiresConfirmation(false)
                    .build();
        }

        TechnicianCandidateDTO bestCandidate = candidates.get(0);
        User bestTechUser = userService.findById(bestCandidate.getTechnicianId())
                .orElseThrow(() -> new CustomException("Technician user not found", HttpStatus.NOT_FOUND));

        workOrder.setPrimaryUser(bestTechUser);
        workOrderRepository.save(workOrder);

        return AutoAssignResponseDTO.builder()
                .assigned(true)
                .workOrderId(workOrder.getId())
                .assignedTechnician(bestCandidate)
                .message("Work order successfully auto-assigned to " + bestTechUser.getFullName())
                .reasons(bestCandidate.getReasons())
                .requiresConfirmation(false)
                .build();
    }

    private int countOpenWorkOrdersForUser(Long userId, Long companyId) {
        return (int) workOrderRepository.findByCompany_Id(companyId).stream()
                .filter(wo -> wo.getPrimaryUser() != null && wo.getPrimaryUser().getId().equals(userId))
                .filter(wo -> wo.getStatus() != com.grash.model.enums.Status.COMPLETE && !wo.isArchived())
                .count();
    }

    private Skill extractRequiredSkill(WorkOrder workOrder) {
        if (workOrder.getParentRequest() != null && workOrder.getParentRequest().getRequiredSkill() != null) {
            return workOrder.getParentRequest().getRequiredSkill();
        }
        return null;
    }
}
