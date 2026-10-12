-- Extensiones necesarias (deben existir antes de las restricciones de exclusión)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'SECRETARY', 'DOCTOR', 'PATIENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'INVITATION');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CI', 'PASSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('FEMALE', 'MALE', 'OTHER', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('DATA_PROCESSING', 'EMAIL_NOTIFICATIONS', 'WHATSAPP_NOTIFICATIONS');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CONSULTATION', 'EVALUATION', 'IMAGING', 'CARDIOLOGY_TEST', 'LABORATORY', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "ProfessionalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ExceptionKind" AS ENUM ('HOLIDAY', 'CLOSURE', 'VACATION', 'ABSENCE', 'BLOCK');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('PORTAL', 'STAFF');

-- CreateEnum
CREATE TYPE "AppointmentEventType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'RESCHEDULED', 'UPDATED');

-- CreateEnum
CREATE TYPE "ContactKind" AS ENUM ('APPOINTMENT', 'GENERAL');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "EncounterStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateEnum
CREATE TYPE "DiagnosisKind" AS ENUM ('PRINCIPAL', 'SECONDARY');

-- CreateEnum
CREATE TYPE "DiagnosisCertainty" AS ENUM ('PRESUMPTIVE', 'CONFIRMED');

-- CreateEnum
CREATE TYPE "ClinicalOrderStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOIDED');

-- CreateEnum
CREATE TYPE "GoalMetric" AS ENUM ('WEIGHT', 'WAIST', 'BMI', 'OTHER');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('LAB_RESULT', 'IMAGING_REPORT', 'MEDICAL_REPORT', 'PRESCRIPTION', 'STUDY_ORDER', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING_REVIEW', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "MessageEvent" AS ENUM ('APPOINTMENT_BOOKED', 'APPOINTMENT_CONFIRMED', 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_REMINDER', 'DOCUMENT_PUBLISHED', 'ADMIN_NOTICE', 'ACCOUNT_VERIFICATION', 'PASSWORD_RESET', 'STAFF_INVITATION');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "passwordChangedAt" TIMESTAMPTZ(3),
    "disabledAt" TIMESTAMPTZ(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "lastActiveAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role" "Role" NOT NULL,
    "permission" TEXT NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role","permission")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'CI',
    "documentNumber" TEXT,
    "birthDate" DATE,
    "sex" "Sex",
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "address" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "insuranceProvider" TEXT,
    "adminNotes" TEXT,
    "portalProgressEnabled" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMPTZ(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialties" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "imagePath" TEXT,
    "imageAlt" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServiceCategory" NOT NULL DEFAULT 'CONSULTATION',
    "specialtyId" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 30,
    "price" INTEGER,
    "showPrice" BOOLEAN NOT NULL DEFAULT false,
    "availabilityConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "bookableOnline" BOOLEAN NOT NULL DEFAULT false,
    "capacityPerSlot" INTEGER NOT NULL DEFAULT 1,
    "preparationNotes" TEXT,
    "imagePath" TEXT,
    "imageAlt" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "slug" TEXT NOT NULL,
    "honorific" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "credentials" TEXT,
    "credentialsVerifiedAt" TIMESTAMPTZ(3),
    "credentialsVerifiedBy" TEXT,
    "bio" TEXT,
    "photoPath" TEXT,
    "status" "ProfessionalStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "acceptsOnlineBooking" BOOLEAN NOT NULL DEFAULT true,
    "agendaColor" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_specialties" (
    "professionalId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,

    CONSTRAINT "professional_specialties_pkey" PRIMARY KEY ("professionalId","specialtyId")
);

-- CreateTable
CREATE TABLE "professional_services" (
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "professional_services_pkey" PRIMARY KEY ("professionalId","serviceId")
);

-- CreateTable
CREATE TABLE "schedule_rules" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "validFrom" DATE,
    "validUntil" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "schedule_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_exceptions" (
    "id" TEXT NOT NULL,
    "professionalId" TEXT,
    "kind" "ExceptionKind" NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "schedule_exceptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "source" "AppointmentSource" NOT NULL,
    "blocksSlot" BOOLEAN NOT NULL DEFAULT true,
    "isOverbook" BOOLEAN NOT NULL DEFAULT false,
    "patientComment" TEXT,
    "adminNotes" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMPTZ(3),
    "cancelledById" TEXT,
    "confirmedAt" TIMESTAMPTZ(3),
    "checkedInAt" TIMESTAMPTZ(3),
    "startedAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "reminderQueuedAt" TIMESTAMPTZ(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_events" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "type" "AppointmentEventType" NOT NULL,
    "fromStatus" "AppointmentStatus",
    "toStatus" "AppointmentStatus",
    "previousStartsAt" TIMESTAMPTZ(3),
    "newStartsAt" TIMESTAMPTZ(3),
    "reason" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "kind" "ContactKind" NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "specialtyId" TEXT,
    "serviceId" TEXT,
    "preferredSchedule" TEXT,
    "message" TEXT,
    "consentAccepted" BOOLEAN NOT NULL,
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "internalNote" TEXT,
    "handledById" TEXT,
    "handledAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_backgrounds" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "allergies" TEXT,
    "currentMedications" TEXT,
    "personalHistory" TEXT,
    "familyHistory" TEXT,
    "surgicalHistory" TEXT,
    "habits" TEXT,
    "notes" TEXT,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_backgrounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "status" "EncounterStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "currentIllness" TEXT,
    "physicalExam" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "followUpInstructions" TEXT,
    "patientInstructions" TEXT,
    "sharePatientInstructions" BOOLEAN NOT NULL DEFAULT false,
    "clinicalNotes" TEXT,
    "nextEvaluationDate" DATE,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounter_addenda" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "reason" TEXT,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encounter_addenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vital_signs" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "measuredAt" TIMESTAMPTZ(3) NOT NULL,
    "weightKg" DECIMAL(5,1),
    "heightCm" DECIMAL(5,1),
    "bmi" DECIMAL(4,1),
    "waistCm" DECIMAL(5,1),
    "hipCm" DECIMAL(5,1),
    "bodyFatPct" DECIMAL(4,1),
    "systolic" INTEGER,
    "diastolic" INTEGER,
    "heartRate" INTEGER,
    "respiratoryRate" INTEGER,
    "temperatureC" DECIMAL(3,1),
    "spo2" INTEGER,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vital_signs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT NOT NULL,
    "kind" "DiagnosisKind" NOT NULL DEFAULT 'PRINCIPAL',
    "certainty" "DiagnosisCertainty" NOT NULL DEFAULT 'PRESUMPTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "notes" TEXT,
    "status" "ClinicalOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMPTZ(3),
    "voidedAt" TIMESTAMPTZ(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dose" TEXT,
    "frequency" TEXT,
    "duration" TEXT,
    "quantity" TEXT,
    "instructions" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_orders" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "studies" TEXT[],
    "indication" TEXT,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "status" "ClinicalOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "issuedAt" TIMESTAMPTZ(3),
    "voidedAt" TIMESTAMPTZ(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "study_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "treatment_goals" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" "GoalMetric" NOT NULL DEFAULT 'OTHER',
    "targetValue" DECIMAL(6,1),
    "targetDate" DATE,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "visibleToPatient" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "treatment_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_documents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "uploadedById" TEXT NOT NULL,
    "uploadedByName" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedByName" TEXT,
    "publishedAt" TIMESTAMPTZ(3),
    "withdrawnAt" TIMESTAMPTZ(3),
    "withdrawnReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "event" "MessageEvent" NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "whatsappTemplateName" TEXT,
    "whatsappLanguage" TEXT DEFAULT 'es',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_messages" (
    "id" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "event" "MessageEvent" NOT NULL,
    "recipient" TEXT NOT NULL,
    "userId" TEXT,
    "patientId" TEXT,
    "appointmentId" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "status" "MessageStatus" NOT NULL DEFAULT 'PENDING',
    "skipReason" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMPTZ(3),
    "providerMessageId" TEXT,
    "dedupeKey" TEXT,
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "outbound_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_content" (
    "key" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "published" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMPTZ(3),

    CONSTRAINT "site_content_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "site_content_versions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "publishedById" TEXT,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_content_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "patientId" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "details" JSONB,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_purpose_idx" ON "auth_tokens"("userId", "purpose");

-- CreateIndex
CREATE INDEX "rate_limits_resetAt_idx" ON "rate_limits"("resetAt");

-- CreateIndex
CREATE UNIQUE INDEX "patients_userId_key" ON "patients"("userId");

-- CreateIndex
CREATE INDEX "patients_lastName_firstName_idx" ON "patients"("lastName", "firstName");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "patients_documentType_documentNumber_key" ON "patients"("documentType", "documentNumber");

-- CreateIndex
CREATE INDEX "consents_patientId_type_createdAt_idx" ON "consents"("patientId", "type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "specialties_slug_key" ON "specialties"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_userId_key" ON "professionals"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_slug_key" ON "professionals"("slug");

-- CreateIndex
CREATE INDEX "schedule_rules_professionalId_weekday_idx" ON "schedule_rules"("professionalId", "weekday");

-- CreateIndex
CREATE INDEX "schedule_exceptions_professionalId_startsAt_idx" ON "schedule_exceptions"("professionalId", "startsAt");

-- CreateIndex
CREATE INDEX "schedule_exceptions_startsAt_endsAt_idx" ON "schedule_exceptions"("startsAt", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_code_key" ON "appointments"("code");

-- CreateIndex
CREATE INDEX "appointments_professionalId_startsAt_idx" ON "appointments"("professionalId", "startsAt");

-- CreateIndex
CREATE INDEX "appointments_patientId_startsAt_idx" ON "appointments"("patientId", "startsAt");

-- CreateIndex
CREATE INDEX "appointments_status_startsAt_idx" ON "appointments"("status", "startsAt");

-- CreateIndex
CREATE INDEX "appointment_events_appointmentId_createdAt_idx" ON "appointment_events"("appointmentId", "createdAt");

-- CreateIndex
CREATE INDEX "contact_requests_status_createdAt_idx" ON "contact_requests"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_backgrounds_patientId_version_key" ON "clinical_backgrounds"("patientId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "encounters_appointmentId_key" ON "encounters"("appointmentId");

-- CreateIndex
CREATE INDEX "encounters_patientId_startedAt_idx" ON "encounters"("patientId", "startedAt");

-- CreateIndex
CREATE INDEX "encounters_professionalId_startedAt_idx" ON "encounters"("professionalId", "startedAt");

-- CreateIndex
CREATE INDEX "encounter_addenda_encounterId_idx" ON "encounter_addenda"("encounterId");

-- CreateIndex
CREATE INDEX "vital_signs_patientId_measuredAt_idx" ON "vital_signs"("patientId", "measuredAt");

-- CreateIndex
CREATE INDEX "diagnoses_patientId_idx" ON "diagnoses"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_verificationCode_key" ON "prescriptions"("verificationCode");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_idx" ON "prescriptions"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "study_orders_verificationCode_key" ON "study_orders"("verificationCode");

-- CreateIndex
CREATE INDEX "study_orders_patientId_idx" ON "study_orders"("patientId");

-- CreateIndex
CREATE INDEX "treatment_goals_patientId_idx" ON "treatment_goals"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_documents_storageKey_key" ON "clinical_documents"("storageKey");

-- CreateIndex
CREATE INDEX "clinical_documents_patientId_status_idx" ON "clinical_documents"("patientId", "status");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_event_channel_key" ON "message_templates"("event", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "outbound_messages_dedupeKey_key" ON "outbound_messages"("dedupeKey");

-- CreateIndex
CREATE INDEX "outbound_messages_status_nextAttemptAt_idx" ON "outbound_messages"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "outbound_messages_createdAt_idx" ON "outbound_messages"("createdAt");

-- CreateIndex
CREATE INDEX "site_content_versions_key_publishedAt_idx" ON "site_content_versions"("key", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storageKey_key" ON "media_assets"("storageKey");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_patientId_createdAt_idx" ON "audit_logs"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_specialties" ADD CONSTRAINT "professional_specialties_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_specialties" ADD CONSTRAINT "professional_specialties_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_events" ADD CONSTRAINT "appointment_events_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "specialties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_backgrounds" ADD CONSTRAINT "clinical_backgrounds_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounter_addenda" ADD CONSTRAINT "encounter_addenda_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vital_signs" ADD CONSTRAINT "vital_signs_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_orders" ADD CONSTRAINT "study_orders_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_orders" ADD CONSTRAINT "study_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "study_orders" ADD CONSTRAINT "study_orders_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_goals" ADD CONSTRAINT "treatment_goals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treatment_goals" ADD CONSTRAINT "treatment_goals_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═════════════════════════════════════════════════════════════
-- Reglas de integridad propias de CMIO (no modeladas por Prisma)
-- ═════════════════════════════════════════════════════════════

-- Coherencia de rangos horarios y parámetros
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_time_order" CHECK ("endsAt" > "startsAt");
ALTER TABLE "schedule_exceptions" ADD CONSTRAINT "schedule_exceptions_time_order" CHECK ("endsAt" > "startsAt");
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_range"
  CHECK ("weekday" BETWEEN 1 AND 7 AND "startMinute" >= 0 AND "endMinute" <= 1440 AND "endMinute" > "startMinute");
ALTER TABLE "services" ADD CONSTRAINT "services_parameters"
  CHECK ("durationMinutes" BETWEEN 5 AND 480 AND "capacityPerSlot" BETWEEN 1 AND 50 AND ("price" IS NULL OR "price" >= 0));

-- Un horario ocupado no puede reservarse nuevamente para el mismo profesional.
-- Garantiza la ausencia de duplicados incluso ante solicitudes simultáneas.
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap_professional"
  EXCLUDE USING gist ("professionalId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE ("blocksSlot" AND "status" IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED'));

-- Un paciente no puede tener dos citas activas superpuestas.
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_no_overlap_patient"
  EXCLUDE USING gist ("patientId" WITH =, tstzrange("startsAt", "endsAt", '[)') WITH &&)
  WHERE ("status" IN ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'));

-- ─────────────────────────────────────────────────────────────
-- Inmutabilidad
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION cmio_reject_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'CMIO_INMUTABLE: los registros de % no pueden modificarse ni eliminarse', TG_TABLE_NAME
    USING ERRCODE = 'P0001';
END;
$$ LANGUAGE plpgsql;

-- Tablas de solo inserción
CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION cmio_reject_change();
CREATE TRIGGER clinical_backgrounds_immutable BEFORE UPDATE OR DELETE ON "clinical_backgrounds"
  FOR EACH ROW EXECUTE FUNCTION cmio_reject_change();
CREATE TRIGGER encounter_addenda_immutable BEFORE UPDATE OR DELETE ON "encounter_addenda"
  FOR EACH ROW EXECUTE FUNCTION cmio_reject_change();
CREATE TRIGGER consents_immutable BEFORE UPDATE OR DELETE ON "consents"
  FOR EACH ROW EXECUTE FUNCTION cmio_reject_change();
CREATE TRIGGER appointment_events_immutable BEFORE UPDATE OR DELETE ON "appointment_events"
  FOR EACH ROW EXECUTE FUNCTION cmio_reject_change();

-- Consultas finalizadas: no se pueden modificar ni eliminar.
CREATE OR REPLACE FUNCTION cmio_protect_finalized_encounter() RETURNS trigger AS $$
BEGIN
  IF OLD."status" = 'FINALIZED' THEN
    RAISE EXCEPTION 'CMIO_CONSULTA_FINALIZADA: la consulta % está finalizada; registre una adenda', OLD."id"
      USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER encounters_protect_finalized BEFORE UPDATE OR DELETE ON "encounters"
  FOR EACH ROW EXECUTE FUNCTION cmio_protect_finalized_encounter();

-- Registros dependientes de una consulta finalizada (signos vitales, diagnósticos).
CREATE OR REPLACE FUNCTION cmio_protect_encounter_children() RETURNS trigger AS $$
DECLARE
  enc_id TEXT;
  enc_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    enc_id := OLD."encounterId";
  ELSIF TG_OP = 'UPDATE' THEN
    enc_id := COALESCE(OLD."encounterId", NEW."encounterId");
  ELSE
    enc_id := NEW."encounterId";
  END IF;
  IF enc_id IS NOT NULL THEN
    SELECT "status"::TEXT INTO enc_status FROM "encounters" WHERE "id" = enc_id;
    IF enc_status = 'FINALIZED' THEN
      RAISE EXCEPTION 'CMIO_CONSULTA_FINALIZADA: no se pueden alterar registros de una consulta finalizada'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vital_signs_protect BEFORE INSERT OR UPDATE OR DELETE ON "vital_signs"
  FOR EACH ROW EXECUTE FUNCTION cmio_protect_encounter_children();
CREATE TRIGGER diagnoses_protect BEFORE INSERT OR UPDATE OR DELETE ON "diagnoses"
  FOR EACH ROW EXECUTE FUNCTION cmio_protect_encounter_children();

-- Recetas y órdenes emitidas: solo se permite anularlas (conservando el contenido).
CREATE OR REPLACE FUNCTION cmio_protect_clinical_order() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'DRAFT' THEN
      RAISE EXCEPTION 'CMIO_ORDEN_EMITIDA: no se puede eliminar un documento emitido; anúlelo'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD."status" = 'VOIDED' THEN
    RAISE EXCEPTION 'CMIO_ORDEN_ANULADA: el documento ya fue anulado' USING ERRCODE = 'P0001';
  END IF;
  IF OLD."status" = 'ISSUED' THEN
    IF NEW."status" <> 'VOIDED'
       OR NEW."verificationCode" <> OLD."verificationCode"
       OR NEW."patientId" <> OLD."patientId"
       OR NEW."encounterId" <> OLD."encounterId"
       OR NEW."issuedAt" IS DISTINCT FROM OLD."issuedAt" THEN
      RAISE EXCEPTION 'CMIO_ORDEN_EMITIDA: un documento emitido solo puede anularse' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prescriptions_protect BEFORE UPDATE OR DELETE ON "prescriptions"
  FOR EACH ROW EXECUTE FUNCTION cmio_protect_clinical_order();
CREATE TRIGGER study_orders_protect BEFORE UPDATE OR DELETE ON "study_orders"
  FOR EACH ROW EXECUTE FUNCTION cmio_protect_clinical_order();

CREATE OR REPLACE FUNCTION cmio_protect_prescription_items() RETURNS trigger AS $$
DECLARE
  rx_status TEXT;
BEGIN
  SELECT "status"::TEXT INTO rx_status FROM "prescriptions"
    WHERE "id" = (CASE WHEN TG_OP = 'INSERT' THEN NEW."prescriptionId" ELSE OLD."prescriptionId" END);
  IF rx_status IS NOT NULL AND rx_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'CMIO_ORDEN_EMITIDA: los ítems de una receta emitida no pueden modificarse'
      USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prescription_items_protect BEFORE INSERT OR UPDATE OR DELETE ON "prescription_items"
  FOR EACH ROW EXECUTE FUNCTION cmio_protect_prescription_items();

-- Documentos clínicos: el archivo y el paciente asociado no pueden cambiar; no se eliminan.
CREATE OR REPLACE FUNCTION cmio_protect_clinical_document() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'CMIO_INMUTABLE: los documentos clínicos no se eliminan; retírelos de publicación'
      USING ERRCODE = 'P0001';
  END IF;
  IF NEW."storageKey" <> OLD."storageKey" OR NEW."sha256" <> OLD."sha256" OR NEW."patientId" <> OLD."patientId" THEN
    RAISE EXCEPTION 'CMIO_INMUTABLE: el archivo de un documento clínico no puede reemplazarse'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clinical_documents_protect BEFORE UPDATE OR DELETE ON "clinical_documents"
  FOR EACH ROW EXECUTE FUNCTION cmio_protect_clinical_document();
