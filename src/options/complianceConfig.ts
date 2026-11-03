/**
 * Centralized Data Privacy, Consent, & Compliance Configuration
 *
 * NOTE: The following contains structured interim/sample copy aligned with Indian DPDPA
 * (Digital Personal Data Protection Act) and clinical optical norms.
 * When Manish (Legal/Privacy Lead) delivers finalized legal text, update the values
 * in this file. No component or layout refactoring will be required.
 */

export interface DataCategoryItem {
  category: string;
  fields: string;
  purpose: string;
}

export interface ComplianceConfig {
  CHILDREN_POLICY: {
    minAge: number;
    noticeTitle: string;
    policyStatement: string;
  };
  FEEDBACK_CONSENT: {
    disclaimer: string;
    purposeNotice: string;
  };
  PRIVACY_NOTICE: {
    categoriesOfData: DataCategoryItem[];
    contactEmail: string;
    dpoAddress: string;
    dpoDesignation: string;
    dpoEmail: string;
    dpoName: string;
    dpoPhone: string;
    effectiveDate: string;
    principles: string[];
    purposesOfCollection: string[];
    retentionSummary: string;
    rights: string[];
    title: string;
    version: string;
    videoCallingDisclosure: string;
  };
  REGISTRATION_CONSENT: {
    checkboxLabel: string;
    errorMessage: string;
    privacyNoticeLinkText: string;
    termsLinkText: string;
    termsUrl: string;
    version: string;
  };
  RETENTION_PERIODS: {
    callMetadataDays: number;
    customerRxDataDays: number;
    feedbackTokenDays: number;
    prescriptionImageDays: number;
  };
}

export const COMPLIANCE_CONFIG: ComplianceConfig = {
  // 1. Store Customer Registration Consent Clause
  REGISTRATION_CONSENT: {
    checkboxLabel:
      'I hereby provide my explicit consent to Titan Eye+ to collect and process my personal details (Name, Mobile, Age, Gender) and ophthalmic measurements (Refraction and prescription images) to conduct a remote tele-optometry consultation, issue a spectacle prescription, and fulfill my optical orders.',
    errorMessage:
      'Customer consent to personal data collection and the Privacy Notice is required to initiate tele-optometry testing.',
    privacyNoticeLinkText: 'Privacy Notice',
    termsLinkText: 'Terms and Conditions',
    termsUrl: 'https://www.titaneyeplus.com/terms-and-conditions',
    version: 'v1.0-interim-2026',
  },

  // 2. Official Privacy Notice & Purpose of Processing
  PRIVACY_NOTICE: {
    categoriesOfData: [
      {
        category: 'Personal Identity & Contact Information',
        fields: 'Full Name, 10-Digit Mobile Number, Age, Gender, Store Code',
        purpose: 'Customer identification, queue sequencing, and prescription delivery',
      },
      {
        category: 'Ophthalmic & Refraction Health Information',
        fields:
          'Auto-refraction readings, PGP (Previous Glass Power), Spherical/Cylindrical/Axis/PD values, Prism/Base, optometrist clinical assessments, and prescription slip photographs',
        purpose: 'Accurate vision correction diagnosis and spectacle lens fabrication',
      },
      {
        category: 'Tele-Consultation Session Metadata',
        fields: 'Call start/end timestamps, call duration, optometrist identifier',
        purpose: 'Clinical quality governance and dispute resolution',
      },
    ],
    contactEmail: 'privacy@titan.co.in',
    dpoAddress:
      'Titan Company Limited, Integrity, #193, Veerasandra, Electronics City P.O., Off Hosur Main Road, Bengaluru, Karnataka 560100',
    dpoDesignation: 'Data Protection & Grievance Redressal Officer',
    dpoEmail: 'dpo@titan.co.in',
    dpoName: 'Grievance Redressal Officer — Data Privacy',
    dpoPhone: '+91 80 6704 7000',
    effectiveDate: 'November 2, 2026',
    principles: [
      'Lawful, Fair & Transparent Processing: Data is processed solely on the basis of explicit informed consent.',
      'Data Minimisation: Only information strictly essential for refraction testing and lens dispensation is collected.',
      'Purpose Limitation: Customer data is never utilized for unconsented secondary purposes or automated algorithmic profiling.',
      'Storage Limitation: Data is permanently purged or anonymized once the statutory retention window lapses.',
      'Integrity & Confidentiality: Encrypted data in transit and at rest, protected by role-based access control and append-only audit logs.',
    ],
    purposesOfCollection: [
      'Conducting live tele-optometry examinations with certified optometrists via secure real-time audio/video.',
      'Measuring subjective and objective refraction values to determine accurate corrective vision powers.',
      'Issuing official optical prescriptions and facilitating spectacle/contact lens manufacturing and dispensing.',
      'Managing order history, warranty claims, and follow-up vision consultations at Titan Eye+ stores.',
      'Complying with statutory healthcare and tele-consultation governance regulations.',
    ],
    retentionSummary:
      'Clinical refraction records are preserved for 3 years in accordance with clinical standards. Uploaded prescription photographs are purged after 90 days. Tele-consultation session logs are retained for 1 year, and survey tokens for 180 days. All expired data is automatically removed via scheduled retention workers.',
    rights: [
      'Right to Access: Request a summary of your personal and vision data held by Titan Eye+.',
      'Right to Correction: Request correction of inaccurate demographic details.',
      'Right to Erasure: Request erasure of your personal data upon completion of warranty/clinical retention obligations.',
      'Right to Grievance Redressal: Lodge inquiries or complaints with our designated Grievance Officer.',
    ],
    title: 'Titan Eye+ Tele-Optometry Privacy Notice',
    version: 'v1.0 (Draft Interim — Pending Legal Sign-Off)',
    videoCallingDisclosure:
      'Video consultations are conducted using peer/SFU WebRTC streaming via Azure Communication Services and Microsoft Teams. Streams are encrypted in transit. In accordance with Titan Eye+ security policy, tele-consultation calls are strictly NOT recorded or stored on any server.',
  },

  // 3. Feedback Mechanism Consent Statement
  FEEDBACK_CONSENT: {
    disclaimer:
      'By submitting your responses, you consent to Titan Eye+ processing your ratings and feedback to monitor optometrist consultation quality and improve our tele-optometry services.',
    purposeNotice:
      'Your feedback is linked to your consultation ID for service improvement and is retained for a maximum of 180 days.',
  },

  // 4. Children’s Data Policy (Under 18 Protection)
  CHILDREN_POLICY: {
    minAge: 18,
    noticeTitle: 'Age Requirement for Tele-Optometry',
    policyStatement:
      'Per Titan Eye+ Clinical & Children Data Protection Policy, remote tele-optometry testing is strictly restricted to individuals aged 18 and older. For minors (under 18), please conduct an in-store physical consultation with an in-house optometrist.',
  },

  // 5. Retention Purge Timelines (Days)
  RETENTION_PERIODS: {
    callMetadataDays: 365, // 1 Year
    customerRxDataDays: 1095, // 3 Years
    feedbackTokenDays: 180, // 6 Months
    prescriptionImageDays: 90, // 90 Days
  },
};

