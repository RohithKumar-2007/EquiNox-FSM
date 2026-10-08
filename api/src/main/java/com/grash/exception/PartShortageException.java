package com.grash.exception;

import com.grash.dto.PartShortageItemDTO;
import lombok.Getter;

import java.util.Date;
import java.util.List;

@Getter
public class PartShortageException extends RuntimeException {
    private final String status = "PART_SHORTAGE";
    private final String requestId;
    private final Long requestInternalId;
    private final String severity = "HIGH";
    private final String exceptionStatus = "OPEN";
    private final Date createdTime = new Date();
    private final List<PartShortageItemDTO> parts;

    public PartShortageException(String requestId, Long requestInternalId, List<PartShortageItemDTO> parts) {
        super(buildMessage(requestId, parts));
        this.requestId = requestId;
        this.requestInternalId = requestInternalId;
        this.parts = parts;
    }

    private static String buildMessage(String requestId, List<PartShortageItemDTO> parts) {
        StringBuilder sb = new StringBuilder();
        sb.append("PART_SHORTAGE on Request ").append(requestId != null ? requestId : "UNKNOWN").append(": ");
        if (parts != null) {
            for (PartShortageItemDTO item : parts) {
                sb.append(item.getPart())
                        .append(" (Required: ").append(item.getRequired())
                        .append(", Available: ").append(item.getAvailable())
                        .append(", Shortage: ").append(item.getShortage())
                        .append("); ");
            }
        }
        return sb.toString();
    }
}
