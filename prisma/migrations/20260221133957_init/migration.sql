-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "KeyType" AS ENUM ('kyber768', 'x25519');

-- CreateEnum
CREATE TYPE "CloudType" AS ENUM ('box', 'gdrive', 'onedrive', 'dropbox', 'server');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('initiated', 'ready', 'downloaded', 'deleted', 'expired');

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM ('url_issued', 'access', 'auth_success', 'auth_fail', 'dl_success', 'dl_fail', 'deleted', 'admin_delete', 'lock', 'unlock');

-- CreateEnum
CREATE TYPE "AuditResult" AS ENUM ('success', 'failure');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('transfer_created', 'transfer_downloaded', 'transfer_expired', 'transfer_deleted', 'auth_failed', 'auth_locked');

-- CreateEnum
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('pending', 'success', 'failed', 'retrying');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "email_hash" CHAR(64) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "password_hash" VARCHAR(72) NOT NULL,
    "totp_secret_enc" TEXT,
    "fido2_credential_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "last_login_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_public_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "key_type" "KeyType" NOT NULL DEFAULT 'kyber768',
    "public_key_b64" TEXT NOT NULL,
    "fingerprint" CHAR(64) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_public_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url_token" VARCHAR(128) NOT NULL,
    "sender_id" UUID NOT NULL,
    "recipient_key_id" UUID,
    "recipient_email" VARCHAR(255) NOT NULL,
    "recipient_email_hash" CHAR(64) NOT NULL,
    "file_hash_sha3" CHAR(64) NOT NULL,
    "encrypted_filename" TEXT,
    "file_size_bytes" BIGINT NOT NULL,
    "cloud_type" "CloudType" NOT NULL,
    "cloud_file_id" TEXT,
    "max_downloads" SMALLINT NOT NULL DEFAULT 1,
    "download_count" SMALLINT NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'initiated',
    "key_cache_ref" VARCHAR(128),
    "is_split_upload" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "downloaded_at" TIMESTAMPTZ,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "transfer_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_upload_parts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "part_index" SMALLINT NOT NULL,
    "total_parts" SMALLINT NOT NULL,
    "cloud_type" "CloudType" NOT NULL,
    "cloud_file_id" TEXT NOT NULL,
    "part_hash_sha3" CHAR(64) NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "cloud_upload_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "session_id" UUID,
    "event_type" "AuditEventType" NOT NULL,
    "actor_id" UUID,
    "ip_address" INET NOT NULL,
    "user_agent_hash" CHAR(64),
    "result" "AuditResult" NOT NULL,
    "error_code" VARCHAR(50),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "endpoint_url" VARCHAR(2048) NOT NULL,
    "secret_enc" TEXT NOT NULL,
    "events" "WebhookEvent"[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "config_id" UUID NOT NULL,
    "event_type" "WebhookEvent" NOT NULL,
    "event_id" UUID NOT NULL,
    "payload_hash" CHAR(64) NOT NULL,
    "http_status" SMALLINT,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'pending',
    "retry_count" SMALLINT NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_hash_key" ON "users"("email_hash");

-- CreateIndex
CREATE INDEX "users_email_hash_idx" ON "users"("email_hash");

-- CreateIndex
CREATE INDEX "users_is_active_role_idx" ON "users"("is_active", "role");

-- CreateIndex
CREATE UNIQUE INDEX "user_public_keys_fingerprint_key" ON "user_public_keys"("fingerprint");

-- CreateIndex
CREATE INDEX "user_public_keys_user_id_is_primary_is_revoked_idx" ON "user_public_keys"("user_id", "is_primary", "is_revoked");

-- CreateIndex
CREATE INDEX "user_public_keys_fingerprint_idx" ON "user_public_keys"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_sessions_url_token_key" ON "transfer_sessions"("url_token");

-- CreateIndex
CREATE INDEX "transfer_sessions_url_token_idx" ON "transfer_sessions"("url_token");

-- CreateIndex
CREATE INDEX "transfer_sessions_sender_id_status_idx" ON "transfer_sessions"("sender_id", "status");

-- CreateIndex
CREATE INDEX "transfer_sessions_recipient_email_hash_idx" ON "transfer_sessions"("recipient_email_hash");

-- CreateIndex
CREATE INDEX "transfer_sessions_expires_at_status_idx" ON "transfer_sessions"("expires_at", "status");

-- CreateIndex
CREATE INDEX "transfer_sessions_status_deleted_at_idx" ON "transfer_sessions"("status", "deleted_at");

-- CreateIndex
CREATE INDEX "transfer_sessions_created_at_idx" ON "transfer_sessions"("created_at");

-- CreateIndex
CREATE INDEX "cloud_upload_parts_session_id_idx" ON "cloud_upload_parts"("session_id");

-- CreateIndex
CREATE INDEX "cloud_upload_parts_deleted_at_idx" ON "cloud_upload_parts"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "cloud_upload_parts_session_id_part_index_key" ON "cloud_upload_parts"("session_id", "part_index");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_session_id_event_type_idx" ON "audit_logs"("session_id", "event_type");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_ip_address_created_at_idx" ON "audit_logs"("ip_address", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_event_type_result_created_at_idx" ON "audit_logs"("event_type", "result", "created_at");

-- CreateIndex
CREATE INDEX "webhook_configs_user_id_is_active_idx" ON "webhook_configs"("user_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_deliveries_event_id_key" ON "webhook_deliveries"("event_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_config_id_status_idx" ON "webhook_deliveries"("config_id", "status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_next_retry_at_idx" ON "webhook_deliveries"("status", "next_retry_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_event_id_idx" ON "webhook_deliveries"("event_id");

-- AddForeignKey
ALTER TABLE "user_public_keys" ADD CONSTRAINT "user_public_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_sessions" ADD CONSTRAINT "transfer_sessions_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_sessions" ADD CONSTRAINT "transfer_sessions_recipient_key_id_fkey" FOREIGN KEY ("recipient_key_id") REFERENCES "user_public_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cloud_upload_parts" ADD CONSTRAINT "cloud_upload_parts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "transfer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "transfer_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "webhook_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
