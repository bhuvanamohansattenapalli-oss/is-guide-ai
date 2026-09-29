-- CreateEnum
CREATE TYPE "InputType" AS ENUM ('TEXT', 'PDF', 'DOCX');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RequirementCategory" AS ENUM ('PRODUCT', 'APPLICATION', 'MATERIAL', 'DIMENSION', 'PERFORMANCE', 'SAFETY', 'ENVIRONMENT', 'TESTING', 'ELECTRICAL', 'CERTIFICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "StandardStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'SUPERSEDED', 'DRAFT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "VersionStatus" AS ENUM ('CURRENT', 'HISTORICAL', 'SUPERSEDED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('NORMATIVE_REFERENCE', 'TEST_METHOD', 'SAFETY', 'INSTALLATION', 'TERMINOLOGY', 'RELATED_PRODUCT', 'RELATED_STANDARD', 'SUPERSEDES', 'AMENDS');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('SPECIFICATION_MATCH', 'SCOPE_MATCH', 'TECHNICAL_MATCH', 'RELATIONSHIP', 'VERSION', 'OTHER');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CertificationCheckStatus" AS ENUM ('IDENTIFIED', 'NOT_IDENTIFIED', 'REVIEW_REQUIRED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_analyses" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "inputType" "InputType" NOT NULL DEFAULT 'TEXT',
    "rawInput" TEXT NOT NULL,
    "language" TEXT DEFAULT 'en',
    "status" "AnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_documents" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileUrl" TEXT,
    "extractedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "procurement_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_requirements" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "category" "RequirementCategory" NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "description" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extracted_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standards" (
    "id" TEXT NOT NULL,
    "standardNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT,
    "category" TEXT,
    "scope" TEXT,
    "status" "StandardStatus" NOT NULL DEFAULT 'ACTIVE',
    "language" TEXT DEFAULT 'en',
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standard_versions" (
    "id" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "publicationDate" TIMESTAMP(3),
    "effectiveDate" TIMESTAMP(3),
    "status" "VersionStatus" NOT NULL DEFAULT 'CURRENT',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standard_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standard_amendments" (
    "id" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "amendmentNumber" TEXT NOT NULL,
    "title" TEXT,
    "publicationDate" TIMESTAMP(3),
    "description" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standard_amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "standard_relationships" (
    "id" TEXT NOT NULL,
    "sourceStandardId" TEXT NOT NULL,
    "targetStandardId" TEXT NOT NULL,
    "relationshipType" "RelationshipType" NOT NULL,
    "description" TEXT,
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standard_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "relevanceScore" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_evidences" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "requirementId" TEXT,
    "evidenceType" "EvidenceType" NOT NULL,
    "evidenceText" TEXT NOT NULL,
    "sourceReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_evidences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_requirements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sourceUrl" TEXT,
    "status" "CertificationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certification_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_certifications" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "certificationRequirementId" TEXT NOT NULL,
    "status" "CertificationCheckStatus" NOT NULL DEFAULT 'REVIEW_REQUIRED',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "procurement_analyses_status_idx" ON "procurement_analyses"("status");

-- CreateIndex
CREATE INDEX "procurement_analyses_createdAt_idx" ON "procurement_analyses"("createdAt");

-- CreateIndex
CREATE INDEX "procurement_analyses_userId_idx" ON "procurement_analyses"("userId");

-- CreateIndex
CREATE INDEX "procurement_documents_analysisId_idx" ON "procurement_documents"("analysisId");

-- CreateIndex
CREATE INDEX "extracted_requirements_analysisId_idx" ON "extracted_requirements"("analysisId");

-- CreateIndex
CREATE INDEX "extracted_requirements_category_idx" ON "extracted_requirements"("category");

-- CreateIndex
CREATE UNIQUE INDEX "standards_standardNumber_key" ON "standards"("standardNumber");

-- CreateIndex
CREATE INDEX "standards_standardNumber_idx" ON "standards"("standardNumber");

-- CreateIndex
CREATE INDEX "standards_status_idx" ON "standards"("status");

-- CreateIndex
CREATE INDEX "standards_category_idx" ON "standards"("category");

-- CreateIndex
CREATE INDEX "standard_versions_standardId_idx" ON "standard_versions"("standardId");

-- CreateIndex
CREATE UNIQUE INDEX "standard_versions_standardId_versionLabel_key" ON "standard_versions"("standardId", "versionLabel");

-- CreateIndex
CREATE INDEX "standard_amendments_standardId_idx" ON "standard_amendments"("standardId");

-- CreateIndex
CREATE INDEX "standard_relationships_sourceStandardId_idx" ON "standard_relationships"("sourceStandardId");

-- CreateIndex
CREATE INDEX "standard_relationships_targetStandardId_idx" ON "standard_relationships"("targetStandardId");

-- CreateIndex
CREATE INDEX "standard_relationships_relationshipType_idx" ON "standard_relationships"("relationshipType");

-- CreateIndex
CREATE UNIQUE INDEX "standard_relationships_sourceStandardId_targetStandardId_re_key" ON "standard_relationships"("sourceStandardId", "targetStandardId", "relationshipType");

-- CreateIndex
CREATE INDEX "recommendations_analysisId_idx" ON "recommendations"("analysisId");

-- CreateIndex
CREATE INDEX "recommendations_standardId_idx" ON "recommendations"("standardId");

-- CreateIndex
CREATE INDEX "recommendation_evidences_recommendationId_idx" ON "recommendation_evidences"("recommendationId");

-- CreateIndex
CREATE INDEX "recommendation_evidences_requirementId_idx" ON "recommendation_evidences"("requirementId");

-- CreateIndex
CREATE INDEX "certification_requirements_name_idx" ON "certification_requirements"("name");

-- CreateIndex
CREATE INDEX "certification_requirements_category_idx" ON "certification_requirements"("category");

-- CreateIndex
CREATE INDEX "analysis_certifications_analysisId_idx" ON "analysis_certifications"("analysisId");

-- CreateIndex
CREATE INDEX "analysis_certifications_certificationRequirementId_idx" ON "analysis_certifications"("certificationRequirementId");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_certifications_analysisId_certificationRequirement_key" ON "analysis_certifications"("analysisId", "certificationRequirementId");

-- CreateIndex
CREATE INDEX "reports_analysisId_idx" ON "reports"("analysisId");

-- AddForeignKey
ALTER TABLE "procurement_analyses" ADD CONSTRAINT "procurement_analyses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_documents" ADD CONSTRAINT "procurement_documents_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "procurement_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_requirements" ADD CONSTRAINT "extracted_requirements_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "procurement_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_versions" ADD CONSTRAINT "standard_versions_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_amendments" ADD CONSTRAINT "standard_amendments_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_relationships" ADD CONSTRAINT "standard_relationships_sourceStandardId_fkey" FOREIGN KEY ("sourceStandardId") REFERENCES "standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "standard_relationships" ADD CONSTRAINT "standard_relationships_targetStandardId_fkey" FOREIGN KEY ("targetStandardId") REFERENCES "standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "procurement_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "standards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_evidences" ADD CONSTRAINT "recommendation_evidences_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_evidences" ADD CONSTRAINT "recommendation_evidences_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "extracted_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_certifications" ADD CONSTRAINT "analysis_certifications_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "procurement_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_certifications" ADD CONSTRAINT "analysis_certifications_certificationRequirementId_fkey" FOREIGN KEY ("certificationRequirementId") REFERENCES "certification_requirements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "procurement_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
