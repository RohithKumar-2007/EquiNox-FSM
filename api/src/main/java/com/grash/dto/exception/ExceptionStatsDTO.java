package com.grash.dto.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExceptionStatsDTO {
    private long total;
    private long open;
    private long critical;
    private long autoResolved;
    private long manualInterventionRequired;
}
