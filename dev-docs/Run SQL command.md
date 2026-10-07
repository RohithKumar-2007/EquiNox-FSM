# Running a SQL Command on the Equinox CMMS Database

This guide explains how to run a SQL command on the PostgreSQL database container used in the `equinox-cmms` Docker Compose setup.

## Prerequisites

- Docker and Docker Compose installed.
- The `equinox-cmms` stack up and running:
  
```bash
docker compose up -d
```

## Access the PostgreSQL Container

To execute a SQL command, first access the running PostgreSQL container:

```bash
docker exec -it equinox_db psql -U $POSTGRES_USER -d equinox
```

- `equinox_db`: Name of the container as defined in `docker-compose.yml`
- `psql`: The PostgreSQL CLI tool
- `-U $POSTGRES_USER`: Connects using the username from environment variables
- `-d equinox`: Connects to the `equinox` database

If your environment variables are not exported, replace `$POSTGRES_USER` with your actual database username.

## Running a SQL Command

Once inside the PostgreSQL shell (`psql`), you can execute any SQL command. For example:

```sql
SELECT * FROM own_user;
```

To exit the `psql` shell, type:

```sql
\q
```

## Running a One-Liner SQL Command Directly

You can also run a SQL command directly without entering the interactive shell:

```bash
docker exec -i equinox_db psql -U $POSTGRES_USER -d equinox -c "SELECT * FROM own_user;"
```

Replace `"SELECT * FROM own_user;"` with your actual SQL command.

For more advanced database operations or bulk SQL files, consider mounting a `.sql` file into the container and executing it.

## Running a `.sql` File

Assuming you have a file `init.sql` in your current directory:

```bash
docker cp init.sql equinox_db:/init.sql
docker exec -i equinox_db psql -U $POSTGRES_USER -d equinox -f /init.sql
```

---

## Troubleshooting

- Ensure the database container is running:  
  ```bash
  docker ps
  ```

- Check logs if connection fails:  
  ```bash
  docker logs equinox_db
  ```

---