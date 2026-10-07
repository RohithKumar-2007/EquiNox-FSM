package com.grash.model;

import com.grash.model.abstracts.Audit;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Vendor profile representing external contractor organization and OEM certifications")
public class VendorProfile extends Audit {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    private String agencyName;
    private String contactPerson;
    private String contactPhone;
    private String slaContractTier;
    private Integer contractedResponseMinutes;

    @ElementCollection
    @Builder.Default
    private List<String> oemCertifications = new ArrayList<>();

    @Builder.Default
    private boolean activeContract = true;
}
