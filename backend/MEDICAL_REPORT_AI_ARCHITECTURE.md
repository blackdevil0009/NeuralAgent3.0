# VaidyaMedX Medical Report AI Architecture

## Backend Architecture

Current implementation preserves the existing Flask/MySQL backend and adds a modular report-analysis engine that can later be split into FastAPI workers.

Flow:

1. `POST /api/reports` accepts one or many files.
2. Files are validated by extension, MIME type, and size.
3. Files are stored in `uploads/reports`; if `FILE_ENCRYPTION_KEY` is configured they are encrypted with Fernet.
4. `POST /api/reports/<id>/analyze` decrypts/reads the file, extracts text, detects common abnormal values, and calls Gemini.
5. Results are stored in `medical_reports`, `report_analysis`, and `ai_insights`.
6. `GET /api/reports/<id>/file` securely downloads the original file, decrypting on the server when needed.

## OCR Pipeline

- PDF text: `pypdf`.
- Image OCR: `Pillow` preprocessing plus `pytesseract` when Tesseract is installed on the host.
- Gemini multimodal fallback: supported PDF/JPG/PNG files under `AI_REPORT_INLINE_MAX_MB` are attached directly to Gemini.
- Rule extraction: common values such as hemoglobin, vitamin D, glucose, HbA1c, TSH, cholesterol, LDL, and triglycerides are checked against baseline ranges.

## AI Analysis Engine

Service: `app/services/report_analysis_service.py`

Gemini output is constrained to JSON:

- `report_summary`
- `key_values`
- `abnormal_values`
- `possible_concerns`
- `suggestions`
- `diet_recommendations`
- `hydration_advice`
- `lifestyle_guidance`
- `risk_level`
- mandatory doctor-consultation recommendation

Safety rules:

- No diagnosis.
- No medication dosage.
- No claim that doctor consultation is unnecessary.
- Always includes: `Consult a licensed doctor for professional diagnosis.`

## MySQL Schema

Existing:

- `users`
- `appointments`
- `medical_reports`

Added:

- `report_analysis`
- `ai_insights`
- `prescriptions`
- `file_storage_logs`
- `consultations`
- `consultation_notes`

## Video Consultation

Backend endpoints:

- `POST /api/consultation/session/start`
- `POST /api/consultation/<consultation_id>/ai-notes`

The session endpoint returns a secure `roomId` for WebRTC/Agora integration. The AI notes endpoint accepts a transcript and generates visit summary, symptoms, and follow-up questions.

## Flutter Frontend Structure

Recommended mobile structure:

```text
lib/
  screens/
    reports/
      report_upload_screen.dart
      report_analysis_screen.dart
      report_history_screen.dart
    consultation/
      consultation_room_screen.dart
      consultation_notes_screen.dart
  services/
    report_api_service.dart
    consultation_api_service.dart
  widgets/
    upload_drop_zone.dart
    report_preview_card.dart
    ai_insight_panel.dart
```

Use `file_picker` or `image_picker` for report/camera upload, `http` or `dio` for upload progress, and WebRTC/Agora SDK for consultation rooms.

## Deployment Guide

Environment:

- `GEMINI_API_KEY`
- `REPORT_GEMINI_MODEL=gemini-2.5-flash`
- `FILE_ENCRYPTION_KEY` for encrypted storage
- `REDIS_URL` for caching/task coordination

Host packages:

- Install Tesseract OCR binary for image OCR.
- Keep uploaded files outside public static paths.
- Use object storage for production scale.
- Run report analysis in background workers for large files.

Recommended next production step:

- Move heavy OCR/Gemini work to Celery/RQ workers.
- Store files in S3/GCS with per-tenant prefixes.
- Add malware scanning such as ClamAV before analysis.
