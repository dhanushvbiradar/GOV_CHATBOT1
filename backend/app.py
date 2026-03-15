"""
Python backend — serves government services, schemes, and document data.
Endpoints:
  GET /services   → list of GovernmentService objects
  GET /schemes    → list of Scheme objects
  GET /documents  → list of DocumentList objects
  GET /health     → {"status": "ok"}
"""

from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Data ──────────────────────────────────────────────────────────────────────

SERVICES = [
    {
        "id": "passport-application",
        "name": "Passport Application",
        "aliases": ["passport", "travel document", "international travel", "apply passport"],
        "description": "Apply for a new Indian passport or renew an existing one through the Passport Seva portal.",
        "officialPortalUrl": "https://www.passportindia.gov.in",
        "relatedServiceIds": ["driving-license", "aadhaar-card"],
        "applicationSteps": [
            {"order": 1, "title": "Register on Passport Seva Portal",
             "description": "Create an account at passportindia.gov.in using your email address.",
             "expandedDetail": "Visit https://www.passportindia.gov.in and click 'New User Registration'."},
            {"order": 2, "title": "Fill the Online Application Form",
             "description": "Log in and complete the passport application form (Form-1).",
             "expandedDetail": "Select 'Apply for Fresh Passport/Re-issue of Passport'."},
            {"order": 3, "title": "Schedule an Appointment",
             "description": "Book an appointment at your nearest Passport Seva Kendra (PSK).",
             "expandedDetail": "After submitting the form, click 'Schedule Appointment'."},
            {"order": 4, "title": "Pay the Application Fee",
             "description": "Pay the applicable fee online via net banking, credit/debit card, or UPI.",
             "expandedDetail": "Fee for a 36-page passport (normal) is Rs 1,500."},
            {"order": 5, "title": "Visit PSK and Submit Documents",
             "description": "Attend your appointment with original documents for verification.",
             "expandedDetail": "Carry the printed appointment letter and original documents."},
            {"order": 6, "title": "Track Application and Receive Passport",
             "description": "Track your application status online; passport is dispatched by Speed Post.",
             "expandedDetail": "Normal processing takes 30-45 days; Tatkaal takes 1-3 working days."},
        ],
    },
    {
        "id": "driving-license",
        "name": "Driving License",
        "aliases": ["driving licence", "DL", "driver license", "learner license", "LL"],
        "description": "Apply for a learner's licence or a permanent driving licence through the Parivahan Sewa portal.",
        "officialPortalUrl": "https://parivahan.gov.in",
        "relatedServiceIds": ["passport-application", "aadhaar-card"],
        "applicationSteps": [
            {"order": 1, "title": "Apply for Learner's Licence",
             "description": "Register on parivahan.gov.in and fill the learner's licence application.",
             "expandedDetail": "Visit https://parivahan.gov.in and select 'Driving Licence Related Services'."},
            {"order": 2, "title": "Pay Fee and Book LL Test Slot",
             "description": "Pay the learner's licence fee and schedule the test at your RTO.",
             "expandedDetail": "Fee is approximately Rs 200 (varies by state)."},
            {"order": 3, "title": "Pass the Learner's Licence Test",
             "description": "Appear for the computer-based or written test at the RTO.",
             "expandedDetail": "The test has 15-20 multiple-choice questions. A score of 60% is required."},
            {"order": 4, "title": "Practice Driving for 30 Days",
             "description": "Drive under supervision with your learner's licence for at least 30 days.",
             "expandedDetail": "You must be accompanied by a licensed driver. Display 'L' plates."},
            {"order": 5, "title": "Apply for Permanent Driving Licence",
             "description": "After 30 days, apply for the permanent DL and schedule a driving test.",
             "expandedDetail": "Log in to parivahan.gov.in and select 'Apply for Driving Licence'."},
            {"order": 6, "title": "Appear for Driving Test and Collect DL",
             "description": "Pass the driving test at the RTO; the DL is dispatched by post.",
             "expandedDetail": "On passing, the DL is mailed to your address within 7 working days."},
        ],
    },
    {
        "id": "aadhaar-card",
        "name": "Aadhaar Card",
        "aliases": ["aadhaar", "aadhar", "UID", "unique identification", "biometric ID", "UIDAI"],
        "description": "Enrol for a new Aadhaar card or update existing Aadhaar details through UIDAI-authorised centres.",
        "officialPortalUrl": "https://uidai.gov.in",
        "relatedServiceIds": ["passport-application", "driving-license"],
        "applicationSteps": [
            {"order": 1, "title": "Locate an Enrolment Centre",
             "description": "Find the nearest UIDAI-authorised Aadhaar enrolment centre.",
             "expandedDetail": "Visit https://appointments.uidai.gov.in to locate centres near you."},
            {"order": 2, "title": "Fill the Enrolment Form",
             "description": "Obtain and fill the Aadhaar Enrolment/Correction Form at the centre.",
             "expandedDetail": "The form requires your full name, date of birth, gender, address, and mobile number."},
            {"order": 3, "title": "Submit Documents",
             "description": "Submit proof of identity (POI) and proof of address (POA) documents.",
             "expandedDetail": "Acceptable POI documents include PAN card, passport, voter ID."},
            {"order": 4, "title": "Biometric Capture",
             "description": "Provide fingerprints, iris scan, and photograph at the enrolment centre.",
             "expandedDetail": "All ten fingerprints and both iris scans are captured."},
            {"order": 5, "title": "Receive Enrolment ID",
             "description": "Collect the enrolment acknowledgement slip with a 14-digit Enrolment ID (EID).",
             "expandedDetail": "Processing typically takes 90 days."},
            {"order": 6, "title": "Download or Receive Aadhaar",
             "description": "Download e-Aadhaar from the UIDAI portal or receive the physical card by post.",
             "expandedDetail": "Visit https://eaadhaar.uidai.gov.in to download your e-Aadhaar."},
        ],
    },
]

SCHEMES = [
    {
        "id": "pm-kisan",
        "name": "PM Kisan Samman Nidhi",
        "purpose": "Provide income support to small and marginal farmers.",
        "benefitDescription": "Rs 6,000 per year paid in three equal instalments of Rs 2,000 directly to the farmer's bank account.",
        "officialPortalUrl": "https://pmkisan.gov.in",
        "documentListId": "doclist-pm-kisan",
        "eligibilityCriteria": [
            {"field": "occupation", "operator": "eq", "value": "farmer"},
            {"field": "landHoldingAcres", "operator": "lte", "value": 5},
            {"field": "annualIncome", "operator": "lt", "value": 200000},
            {"field": "residencyStatus", "operator": "in", "value": ["citizen", "resident"]},
        ],
    },
    {
        "id": "ayushman-bharat",
        "name": "Ayushman Bharat PM-JAY",
        "purpose": "Provide health coverage to economically vulnerable families.",
        "benefitDescription": "Health cover of Rs 5 lakh per family per year for hospitalisation expenses.",
        "officialPortalUrl": "https://pmjay.gov.in",
        "documentListId": "doclist-ayushman-bharat",
        "eligibilityCriteria": [
            {"field": "annualIncome", "operator": "lte", "value": 100000},
            {"field": "residencyStatus", "operator": "in", "value": ["citizen", "resident"]},
            {"field": "age", "operator": "gte", "value": 0},
        ],
    },
    {
        "id": "national-scholarship",
        "name": "National Scholarship Portal Scheme",
        "purpose": "Support meritorious students from economically weaker sections.",
        "benefitDescription": "Scholarship ranging from Rs 10,000 to Rs 50,000 per year.",
        "officialPortalUrl": "https://scholarships.gov.in",
        "documentListId": "doclist-national-scholarship",
        "eligibilityCriteria": [
            {"field": "age", "operator": "lte", "value": 25},
            {"field": "annualIncome", "operator": "lt", "value": 250000},
            {"field": "residencyStatus", "operator": "eq", "value": "citizen"},
            {"field": "gender", "operator": "in", "value": ["male", "female", "other"]},
        ],
    },
]

DOCUMENTS = [
    {
        "id": "doclist-passport-application",
        "serviceOrSchemeId": "passport-application",
        "documents": [
            {"name": "Proof of Identity", "description": "A government-issued photo ID.", "isMandatory": True,
             "obtainFromUrl": "https://uidai.gov.in", "submitToUrl": "https://www.passportindia.gov.in"},
            {"name": "Proof of Address", "description": "A document confirming the applicant's current residential address.", "isMandatory": True,
             "obtainFromUrl": "https://uidai.gov.in", "submitToUrl": "https://www.passportindia.gov.in"},
            {"name": "Proof of Date of Birth", "description": "A document confirming the applicant's date of birth.", "isMandatory": True,
             "obtainFromUrl": "https://crsorgi.gov.in", "submitToUrl": "https://www.passportindia.gov.in"},
            {"name": "Old Passport", "description": "The applicant's previous passport for re-issue applications.", "isMandatory": False,
             "condition": "Required if applying for re-issue.", "submitToUrl": "https://www.passportindia.gov.in"},
        ],
    },
    {
        "id": "doclist-driving-license",
        "serviceOrSchemeId": "driving-license",
        "documents": [
            {"name": "Proof of Age", "description": "A document confirming the applicant meets the minimum age requirement.", "isMandatory": True,
             "obtainFromUrl": "https://uidai.gov.in", "submitToUrl": "https://parivahan.gov.in"},
            {"name": "Proof of Address", "description": "A document confirming the applicant's current residential address.", "isMandatory": True,
             "obtainFromUrl": "https://uidai.gov.in", "submitToUrl": "https://parivahan.gov.in"},
            {"name": "Medical Certificate (Form 1A)", "description": "A medical fitness certificate.", "isMandatory": True,
             "obtainFromUrl": "https://parivahan.gov.in", "submitToUrl": "https://parivahan.gov.in"},
            {"name": "Learner's Licence", "description": "A valid learner's licence held for at least 30 days.", "isMandatory": False,
             "condition": "Required when applying for a permanent DL.", "obtainFromUrl": "https://parivahan.gov.in", "submitToUrl": "https://parivahan.gov.in"},
        ],
    },
    {
        "id": "doclist-aadhaar-card",
        "serviceOrSchemeId": "aadhaar-card",
        "documents": [
            {"name": "Proof of Identity (POI)", "description": "A government-issued photo ID.", "isMandatory": True,
             "obtainFromUrl": "https://uidai.gov.in", "submitToUrl": "https://appointments.uidai.gov.in"},
            {"name": "Proof of Address (POA)", "description": "A document confirming the applicant's current residential address.", "isMandatory": True,
             "obtainFromUrl": "https://uidai.gov.in", "submitToUrl": "https://appointments.uidai.gov.in"},
            {"name": "Proof of Date of Birth", "description": "A document confirming the applicant's date of birth.", "isMandatory": False,
             "condition": "Required if the applicant wishes to have their verified DOB printed.",
             "obtainFromUrl": "https://crsorgi.gov.in", "submitToUrl": "https://appointments.uidai.gov.in"},
        ],
    },
    {
        "id": "doclist-pm-kisan",
        "serviceOrSchemeId": "pm-kisan",
        "documents": [
            {"name": "Aadhaar Card", "description": "Mandatory for identity verification and direct benefit transfer.", "isMandatory": True,
             "obtainFromUrl": "https://uidai.gov.in", "submitToUrl": "https://pmkisan.gov.in"},
            {"name": "Land Ownership Records (Khasra/Khatauni)", "description": "Revenue records confirming the farmer's ownership.", "isMandatory": True,
             "obtainFromUrl": "https://bhulekh.gov.in", "submitToUrl": "https://pmkisan.gov.in"},
            {"name": "Bank Account Details", "description": "Bank passbook or cancelled cheque for direct benefit transfer.", "isMandatory": True,
             "obtainFromUrl": "https://www.india.gov.in", "submitToUrl": "https://pmkisan.gov.in"},
        ],
    },
    {
        "id": "doclist-ayushman-bharat",
        "serviceOrSchemeId": "ayushman-bharat",
        "documents": [
            {"name": "Aadhaar Card", "description": "Identity proof for beneficiary verification.", "isMandatory": True,
             "obtainFromUrl": "https://uidai.gov.in", "submitToUrl": "https://pmjay.gov.in"},
            {"name": "Ration Card", "description": "Proof of inclusion in the SECC database or BPL category.", "isMandatory": True,
             "obtainFromUrl": "https://nfsa.gov.in", "submitToUrl": "https://pmjay.gov.in"},
            {"name": "Income Certificate", "description": "Certificate confirming annual household income.", "isMandatory": False,
             "condition": "Required if the applicant's name is not in the SECC database.",
             "obtainFromUrl": "https://serviceonline.gov.in", "submitToUrl": "https://pmjay.gov.in"},
        ],
    },
    {
        "id": "doclist-national-scholarship",
        "serviceOrSchemeId": "national-scholarship",
        "documents": [
            {"name": "Aadhaar Card", "description": "Mandatory identity proof for scholarship disbursement.", "isMandatory": True,
             "obtainFromUrl": "https://uidai.gov.in", "submitToUrl": "https://scholarships.gov.in"},
            {"name": "Previous Year Mark Sheet", "description": "Mark sheet of the last qualifying examination.", "isMandatory": True,
             "obtainFromUrl": "https://www.india.gov.in", "submitToUrl": "https://scholarships.gov.in"},
            {"name": "Income Certificate", "description": "Certificate confirming the family's annual income.", "isMandatory": True,
             "obtainFromUrl": "https://serviceonline.gov.in", "submitToUrl": "https://scholarships.gov.in"},
            {"name": "Bank Account Details", "description": "Bank passbook or cancelled cheque for scholarship disbursement.", "isMandatory": True,
             "obtainFromUrl": "https://www.india.gov.in", "submitToUrl": "https://scholarships.gov.in"},
            {"name": "Caste Certificate", "description": "Certificate confirming the applicant's caste category (SC/ST/OBC).", "isMandatory": False,
             "condition": "Required if applying under a caste-specific scholarship category.",
             "obtainFromUrl": "https://serviceonline.gov.in", "submitToUrl": "https://scholarships.gov.in"},
        ],
    },
]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/services")
def get_services():
    return jsonify(SERVICES)


@app.route("/schemes")
def get_schemes():
    return jsonify(SCHEMES)


@app.route("/documents")
def get_documents():
    return jsonify(DOCUMENTS)


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
