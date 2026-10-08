package com.grash.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.grash.dto.IdDTO;
import com.grash.model.abstracts.CompanyAudit;
import com.grash.model.enums.PermissionEntity;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@Schema(description = "Skill entity representing technical qualifications or certifications required for maintenance work")
public class Skill extends CompanyAudit {

    @NotNull
    @Schema(description = "Name of the skill or certification", requiredMode = Schema.RequiredMode.REQUIRED)
    private String name;

    @Schema(description = "Detailed description of the skill")
    private String description;

    @ManyToMany
    @JoinTable(name = "T_Skill_User_Associations",
            joinColumns = @JoinColumn(name = "id_skill"),
            inverseJoinColumns = @JoinColumn(name = "id_user"),
            indexes = {
                    @Index(name = "idx_skill_user_skill_id", columnList = "id_skill"),
                    @Index(name = "idx_skill_user_user_id", columnList = "id_user")
            })
    @ArraySchema(
            schema = @Schema(implementation = IdDTO.class),
            arraySchema = @Schema(description = "List of users with this skill")
    )
    private List<User> users = new ArrayList<>();

    public boolean canBeEditedBy(User user) {
        return user.getRole().getEditOtherPermissions().contains(PermissionEntity.SETTINGS);
    }

    public boolean canBeDeletedBy(User user) {
        return user.getRole().getDeleteOtherPermissions().contains(PermissionEntity.SETTINGS);
    }

    public boolean canBeViewedBy(User user) {
        return user.getCompany().getId().equals(this.getCompany().getId());
    }
}
