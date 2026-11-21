#!/usr/bin/env bash
# ==============================================================================
# CivicSetu: Google Cloud Free Tier One-Time Setup Script
# Configures Cloud Run, Artifact Registry, and Service Account for GitHub Actions
# ==============================================================================

set -euo pipefail

echo "========================================================"
echo "  CivicSetu Google Cloud Free Tier Setup"
echo "========================================================"

if [ -z "${1:-}" ]; then
  echo "Usage: ./scripts/setup_gcp_free_tier.sh <YOUR_GCP_PROJECT_ID>"
  exit 1
fi

PROJECT_ID="civicsetu-515403"
REGION="us-central1"
GAR_NAME="civicsetu-repo"
SA_NAME="civicsetu-deployer"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Configuring GCP Project: ${PROJECT_ID}..."
gcloud config set project "${PROJECT_ID}"

echo "Enabling required Free Tier Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  cloudbuild.googleapis.com

echo "Creating Artifact Registry repository (${GAR_NAME} in ${REGION})..."
gcloud artifacts repositories create "${GAR_NAME}" \
  --repository-format=docker \
  --location="${REGION}" \
  --description="CivicSetu Free Tier Container Registry" \
  --quiet || echo "Artifact repository already exists."

echo "Creating Service Account for GitHub Actions deployment..."
gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="CivicSetu CI/CD Deployer" \
  --quiet || echo "Service account already exists."

echo "Assigning minimum required roles for deployment..."
# 1. Cloud Run Admin
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin" --quiet

# 2. Artifact Registry Writer
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer" --quiet

# 3. Service Account User (needed by Cloud Run runtime)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" --quiet

echo "Generating GitHub Actions JSON credentials key..."
KEY_FILE="gcp-key-${PROJECT_ID}.json"
gcloud iam service-accounts keys create "${KEY_FILE}" \
  --iam-account="${SA_EMAIL}"

echo ""
echo "========================================================"
echo "  Setup Complete! Next Steps for GitHub Autodeploy:"
echo "========================================================"
echo "1. Go to your GitHub repository -> Settings -> Secrets and variables -> Actions"
echo "2. Add the following Repository Secrets:"
echo "   - GCP_PROJECT_ID        : ${PROJECT_ID}"
echo "   - GCP_SA_KEY            : (Copy and paste full contents of ${KEY_FILE})"
echo "   - GEMINI_API_KEY        : (Your Google AI Studio Gemini API Key)"
echo "   - OPENROUTER_API_KEY    : (Your OpenRouter API Key)"
echo ""
echo "3. Delete the local key file for security:"
echo "   rm ${KEY_FILE}"
echo "4. Push a commit to 'main' branch to trigger the automated build & deploy!"
echo "========================================================"
