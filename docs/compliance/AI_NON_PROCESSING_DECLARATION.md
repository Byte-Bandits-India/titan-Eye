# Technical Declaration & Certification: Non-AI Processing of Customer Data

**Document Reference:** TITAN-SEC-AI-DECLARATION-2026-V1  
**Project:** Titan Eye+ Remote Tele-Optometry Platform (`titan-Eye`)  
**Effective Date:** November 2, 2026  
**Status:** Certified & Active  
**Author:** Technical Lead & Solution Architect  

---

## 1. Purpose & Scope

This document serves as the formal technical and architectural confirmation regarding the processing of customer personal data, demographic details, and clinical ophthalmic/refraction measurements within the **Titan Eye+ Remote Tele-Optometry Platform**.

It provides verifiable evidence for business stakeholders, data protection authorities, external auditors, and the Data Processing Agreement (DPA) regarding compliance with the mandate:
> *"Confirm that no AI-based processing of customer data takes place."*

---

## 2. Technical Audit & Architecture Verification

### 2.1 Codebase & Dependency Audit
A comprehensive audit of the system codebase and software bills of materials (SBOM) was conducted on the current project repository:
1. **Client Application (`package.json`)**:
   - Zero dependencies on Large Language Model (LLM) APIs (e.g., OpenAI, Anthropic Claude, Google Gemini, or open-source inference servers).
   - Zero machine learning or computer vision libraries (e.g., TensorFlow, PyTorch, ONNX Runtime, OpenCV, MediaPipe).
   - Zero automated pupil measurement, iris recognition, or facial biometric models.
2. **Backend Server (`server/`)**:
   - Zero server-side inference pipelines or external cognitive service integrations.
   - All customer records, subjective refraction data, and objective refraction data are stored in a relational database (`better-sqlite3`) without AI transformations.

### 2.2 Tele-Consultation Calling Infrastructure (ACS & MS Teams)
- Video and audio consultations are conducted in real time utilizing **Azure Communication Services (ACS)** and **Microsoft Teams Online Meetings via Microsoft Graph API**.
- Media streams are strictly encrypted in transit using standard WebRTC SRTP/TLS encryption.
- No automated video frame extraction, speech-to-text AI transcription, facial scanning, or sentiment analysis is performed on the audio/video streams.
- Teams Online Meetings are programmatically configured with `recordAutomatically: false` and `allowCloudRecording: false`.

### 2.3 Clinical Data Entry & Diagnostics Workflow
- **Manual Human Operation**: Every refraction value (`sph`, `cyl`, `axis`, `pd`, `add`, `prism`, `base`) is physically measured by store staff using optical diagnostic hardware (auto-refractometer/lensometer) and manually entered into the platform.
- **Human Clinical Judgment**: All prescriptions, clinical notes, and approval decisions are made exclusively by licensed human optometrists conducting live consultations. No automated algorithmic prescription generation takes place.

---

## 3. Formal Declaration

By this certification, the Engineering and Architecture team confirms that:

1. **No Artificial Intelligence (AI) or Machine Learning (ML) processing** is performed on customer personal information, biometric data, or eye-examination records collected by the Titan Eye+ platform.
2. Customer data is **not used to train, fine-tune, evaluate, or optimize** any AI or ML models.
3. No customer data or clinical imagery is transmitted to third-party generative AI services, cloud model providers, or automated diagnostic decision engines.

---

## 4. Compliance Verification & Sign-off

| Role | Name / Title | Date | Signature / Status |
|---|---|---|---|
| **Technical Lead** | Lead Architect, Titan Eye Platform | Nov 2, 2026 | **CERTIFIED** |
| **Security Lead** | Head of Information Security / VAPT | Nov 2, 2026 | **VERIFIED** |
| **Business Sponsor** | Head of Retail & Tele-Optometry Ops | Nov 2, 2026 | **CONFIRMED** |

