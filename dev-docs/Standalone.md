# Equinox standalone operation

This fork runs without payment activation, trials, commercial seat limits, or
license purchases. Operational features are available to users whose roles allow
them. Authentication, explicit account disabling, and company isolation remain.

Legacy subscription database records remain for compatibility. They do not
expire or restrict operational features. Billing controllers are excluded from
the default application profile. Existing billing URLs redirect to work orders.

## Build and start a new installation

```powershell
docker compose up -d --build
```

## Update the existing local installation

The original local database is named `atlas`, its project is `atlas-cmms`, and
uploaded files use `atlas-bucket`. Use the compatibility override to preserve
these identifiers:

```powershell
docker compose -p atlas-cmms -f docker-compose.yml -f docker-compose.local.yml up -d --build --no-deps api frontend
docker exec atlas_nginx nginx -s reload
```

Do not remove database/storage volumes to apply application updates.
Email delivery still needs SMTP configuration if notifications are wanted.
Source attribution and the repository's AGPL license remain in effect.
