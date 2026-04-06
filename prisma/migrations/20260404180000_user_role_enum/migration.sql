-- Migración segura: VARCHAR -> enum PostgreSQL sin borrar filas
-- Valores existentes deben ser exactamente: ADMIN, JEFE_COMUNIDAD, JEFE_CALLE

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'JEFE_COMUNIDAD', 'JEFE_CALLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::text::"UserRole");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'JEFE_CALLE'::"UserRole";
