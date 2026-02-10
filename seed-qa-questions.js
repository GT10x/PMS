const { Client } = require('pg');

// ─── Configuration ───────────────────────────────────────────────────────────
const DATABASE_URL = 'postgresql://postgres:jp3VGp02fXhSwgNI@db.loihxoyrutbzmqscdknk.supabase.co:5432/postgres';
const PROJECT_ID = 'b8f73b83-bd67-47e9-9514-8760e7804d35';

const USERS = {
  Piush: 'd60a4c5e-aa9f-4cdb-999a-41f0bd23d09e',
  Dhavalbhai: 'a3896ccb-149a-4d8c-8c89-a279320a85d2',
  Manishbhai: '51688af1-b733-4d90-bf41-1d8f4547780f',
};

// ─── Piush's 49 Questions ────────────────────────────────────────────────────
const piushQuestions = [
  {
    question_id: "PQ1",
    question_text: "How should the fee structure work -- fixed per class, component-based (tuition + transport + lab separately), or flexible (school decides)?",
    topic: "Fees Management",
    priority: "must",
    context: "This determines our entire fee data model. Component-based means each fee line is a separate record. Fixed means one amount per class.",
    cto_response: "<strong>Decision: FULLY CONFIGURABLE</strong> fee system with templates.<br><br>Architecture: Fee Template \u2192 Fee Groups \u2192 Fee Components \u2192 Fee Schedule \u2192 Installment Plan<br><br><table><tr><th>Model</th><th>Description</th></tr><tr><td>Unified Annual</td><td>Single fee amount per year</td></tr><tr><td>Component-Based</td><td>Tuition + Transport + Lab separately</td></tr><tr><td>Term/Installment</td><td>Split into quarterly/monthly payments</td></tr><tr><td>Class-wise</td><td>Different amounts per class/grade</td></tr><tr><td>Category-wise</td><td>Different for day-scholar vs boarding</td></tr><tr><td>New vs Existing</td><td>Different for new admission vs continuing</td></tr></table>",
    answer_status: "answered",
    answer_text: "Fee structure will be different for each school. Build a modular and customizable approach. Give all options which a school can choose while onboarding.",
    round: "Round 10",
    sort_order: 1,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ1a",
    question_text: "Fee Payment Modes (Phase 1) -- which payment collection methods should Phase 1 support?",
    topic: "Fees Management",
    priority: "must",
    context: "Options:\n(a) Cash only -- receipt in ERP, collected offline\n(b) Cash + Cheque + Bank Transfer -- all offline, ERP tracks records\n(c) Cash + Cheque + Bank Transfer + Online Gateway (Razorpay/Paytm)\n(d) Only offline in Phase 1, add online gateway in Phase 2\n\n[CTO recommends D -- Phase 2 already has M10 Payment Gateway module]",
    cto_response: "<strong>Decision: Phase 1 = manual entry of ALL payment types. Phase 2 (M10) = online gateway with auto-reconciliation.</strong><br>All payment types accepted but entered manually in Phase 1.",
    answer_status: "answered",
    answer_text: "All types of payments will be there. Phase 1 everything manually entered. Phase 2 auto from gateway.",
    round: "Follow-up",
    sort_order: 2,
    parent_question_id_ref: "PQ1"
  },
  {
    question_id: "PQ1b",
    question_text: "Who should have permission to record a fee payment in the ERP?",
    topic: "Fees Management",
    priority: "must",
    context: "Options:\n(a) Only the Accountant/Fee Clerk\n(b) Accountant + School Admin\n(c) Configurable -- school decides which profiles can collect fees\n(d) Anyone with admin access\n\n[CTO recommends C -- fits our profile-based permission system]",
    cto_response: "<strong>Decision: C -- Configurable, school decides.</strong><br>Fee collection permission is profile-based. School configures which profiles can record payments during onboarding.",
    answer_status: "answered",
    answer_text: "C -- Configurable, school decides.",
    round: "Follow-up",
    sort_order: 3,
    parent_question_id_ref: "PQ1"
  },
  {
    question_id: "PQ1c",
    question_text: "Fee Concessions/Scholarships -- how should discounts work?",
    topic: "Fees Management",
    priority: "must",
    context: "Options:\n(a) Percentage-based only\n(b) Fixed amount only\n(c) Both percentage AND fixed amount\n(d) Both + auto-rules (sibling = auto 10% off, staff-child = auto 50% off)\n\n[CTO recommends D -- auto-rules save admin time]",
    cto_response: "<strong>Deferred to Manishbhai.</strong> Build ready-to-use templates, school picks during onboarding. See Q121 for Manishbhai.",
    answer_status: "deferred",
    answer_text: "Deferred to Manishbhai. Build ready-to-use templates.",
    deferred_to: "Manishbhai",
    deferred_note: "Need real-world concession templates from school admin experience",
    round: "Follow-up",
    sort_order: 4,
    parent_question_id_ref: "PQ1"
  },
  {
    question_id: "PQ1d",
    question_text: "Late Fee Policy -- how should late fees work?",
    topic: "Fees Management",
    priority: "must",
    context: "Options:\n(a) No late fees in Phase 1\n(b) Flat amount per day/month\n(c) Percentage of outstanding amount\n(d) Configurable -- school chooses flat OR percentage, plus grace period\n\n[CTO recommends D]",
    cto_response: "<strong>Deferred to Manishbhai.</strong> Build ready-to-use templates, school picks during onboarding. See Q122 for Manishbhai.",
    answer_status: "deferred",
    answer_text: "Deferred to Manishbhai. Build ready-to-use templates.",
    deferred_to: "Manishbhai",
    deferred_note: "Need real-world late fee patterns from school admin experience",
    round: "Follow-up",
    sort_order: 5,
    parent_question_id_ref: "PQ1"
  },
  {
    question_id: "PQ2",
    question_text: "How should concessions/scholarships work -- percentage off, fixed amount, or both? Should there be an approval workflow for concessions?",
    topic: "Fees Management",
    priority: "must",
    context: "Affects fee calculation engine and whether concessions use the multi-approval workflow.\n[NOTE: If you answered PQ1c above, you may skip this or add specifics about approval workflow]",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "Round 10",
    sort_order: 6,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ3",
    question_text: "Should we support partial fee payments? If yes, how should the remaining balance be tracked -- against specific components or as a general outstanding?",
    topic: "Fees Management",
    priority: "must",
    context: "Partial payments add complexity. Need to know if schools commonly accept them.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "Round 10",
    sort_order: 7,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ4",
    question_text: "Fee receipt -- should it be auto-generated on payment, or manually triggered? Should it be printable, emailable, or both?",
    topic: "Fees Management",
    priority: "must",
    context: "Receipt generation workflow and template system.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "Round 10",
    sort_order: 8,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ5",
    question_text: "Fee defaulters -- should the ERP block exam results or report card access until fees are cleared? Should this be school-configurable?",
    topic: "Fees Management",
    priority: "should",
    context: "Cross-module dependency between Fees and LMS/Results. EduNext consultant flagged this as common practice.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 9,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ6",
    question_text: "Late fee -- should we support both flat amount AND percentage options? Should there be a configurable grace period per installment?",
    topic: "Fees Management",
    priority: "should",
    context: "Late fee rules vary widely between schools.\n[NOTE: PQ1d covers this at a higher level. Use this for specific details.]",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 10,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ7",
    question_text: "Multi-tenancy: CTO recommends shared DB with RLS. Are you comfortable with all schools sharing one database (data isolation via security policies), or do you want separate databases per school?",
    topic: "Architecture",
    priority: "must",
    context: "This is the single biggest architecture decision still pending. Shared DB = cheaper, simpler, cross-school features easier. Separate DB = more isolation but 10x cost.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "Round 4",
    sort_order: 11,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ8",
    question_text: "API versioning -- when we update the ERP, should old API versions keep working (for schools with older mobile apps) or force everyone to update?",
    topic: "Architecture",
    priority: "should",
    context: "Affects how we deploy updates. Force-update is simpler but risky.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 12,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ9",
    question_text: "Monitoring -- what level of uptime do you promise schools? 99.9% (8.7 hours downtime/year) or 99.5% (1.8 days/year)?",
    topic: "Architecture",
    priority: "should",
    context: "Higher uptime = more infrastructure cost. Affects our hosting strategy.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 13,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ10",
    question_text: "Parent login credentials -- should admin create them manually, or should parents self-register (via admission link/QR code)?",
    topic: "Auth & Login",
    priority: "must",
    context: "Self-registration reduces admin workload but needs verification.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 14,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ11",
    question_text: "Session duration -- how long before a user gets logged out due to inactivity? Same for all roles or different? (e.g., admin: 2 hours, parent: 7 days)",
    topic: "Auth & Login",
    priority: "should",
    context: "Security vs convenience tradeoff. Parents want to stay logged in, admins should have shorter sessions.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 15,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ12",
    question_text: "Forgot password for parents who use phone/OTP -- if they change their phone number, what's the recovery process?",
    topic: "Auth & Login",
    priority: "should",
    context: "Common real-world scenario. Admin resets? Or secondary contact?",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 16,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ13",
    question_text: "Student photo -- mandatory or optional during admission? Should there be a photo size/quality requirement?",
    topic: "Student Management",
    priority: "should",
    context: "Storage planning + ID card generation.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 17,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ14",
    question_text: "Student house system (like Red House, Blue House) -- is this common enough to include in Phase 1, or can it wait?",
    topic: "Student Management",
    priority: "should",
    context: "Affects student profile fields and competition/event tracking.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 18,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ15",
    question_text: "During year-end promotion, what happens to students who fail? Detained in same class? Or school decides case-by-case?",
    topic: "Student Management",
    priority: "must",
    context: "Promotion wizard logic -- need to handle detained students.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 19,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ16",
    question_text: "Attendance frequency -- should teachers mark attendance once per day or period-by-period? (Period-wise = 6-8x more data)",
    topic: "Teacher Dashboard",
    priority: "must",
    context: "Major data volume and UI decision. Ask Manishbhai Q35 for real-world practice.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 20,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ17",
    question_text: "Substitution management -- when a teacher is absent, should the ERP help assign a substitute, or is that done manually by VP/coordinator?",
    topic: "Teacher Dashboard",
    priority: "should",
    context: "Could be a simple Phase 1 feature or complex Phase 2 feature depending on scope.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 21,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ18",
    question_text: "Employee self-attendance -- should we show a map with the geo-fence boundary to the employee, so they know if they're within range?",
    topic: "Teacher Dashboard",
    priority: "should",
    context: "UX decision for the geo-tagged punch feature.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 22,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ19",
    question_text: "Trustee/Management view -- should trustees get their own login and dashboard, or should the principal share reports with them via email/WhatsApp?",
    topic: "Principal Dashboard",
    priority: "should",
    context: "Trustee is a stakeholder in our list but usage may be very low. Ask Manishbhai Q65.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 23,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ20",
    question_text: "SQAAF compliance -- do you have the SQAAF framework document with all domains and criteria? Can you share it?",
    topic: "Principal Dashboard",
    priority: "should",
    context: "Need the actual SQAAF checklist to build the tracker feature.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 24,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ21",
    question_text: "Online admission form -- should parents be able to fill an admission enquiry from the school's website/link, or only in-person/phone?",
    topic: "Enquiry & Admission",
    priority: "should",
    context: "If online, we need a public-facing enquiry form (no login required).",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 25,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ22",
    question_text: "Admission test/interview -- do your target schools conduct entrance tests? Should we include test scheduling in the enquiry flow?",
    topic: "Enquiry & Admission",
    priority: "should",
    context: "Adds complexity to enquiry-to-admission pipeline.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 26,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ23",
    question_text: "Report card format -- do you have a sample report card from any school? Can you share it so we can design the template system?",
    topic: "LMS & Academics",
    priority: "must",
    context: "Report card is one of the most important outputs of the ERP. Need real examples.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 27,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ24",
    question_text: "Exam types for Phase 1 -- should we support only written exams, or also practicals, projects, oral exams with separate marks?",
    topic: "LMS & Academics",
    priority: "should",
    context: "Each exam type may have different grading logic.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 28,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ25",
    question_text: "Co-scholastic grades (art, music, sports, life skills) -- should these appear on the report card in Phase 1?",
    topic: "LMS & Academics",
    priority: "should",
    context: "CBSE requires co-scholastic assessment on report cards.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 29,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ26",
    question_text: "WhatsApp API budget -- are schools willing to pay for WhatsApp messages? Or should the ERP absorb the cost in subscription?",
    topic: "Notifications",
    priority: "must",
    context: "WhatsApp API costs ~Rs 0.50-1 per message. At 500 parents x 20 messages/month = Rs 5,000-10,000/month per school.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 30,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ27",
    question_text: "SMS provider preference for Indian market -- do you have a preference? (MSG91, Twilio, Kaleyra, Textlocal?)",
    topic: "Notifications",
    priority: "should",
    context: "Need to pick a primary SMS provider for OTP and notifications.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 31,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ28",
    question_text: "Email provider -- Resend, SendGrid, or Amazon SES? Any preference based on cost/reliability?",
    topic: "Notifications",
    priority: "should",
    context: "Transactional emails for receipts, circulars, reports.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 32,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ29",
    question_text: "Gatekeeper device -- should we assume the gatekeeper uses a personal phone, or should schools provide a dedicated tablet at the gate?",
    topic: "Visitor Management",
    priority: "should",
    context: "Affects screen size optimization and app mode (kiosk vs normal).",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 33,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ30",
    question_text: "Authorized pickup persons -- should parents pre-register a list of people authorized to pick up their child? (Grandparent, driver, relative)",
    topic: "Visitor Management",
    priority: "should",
    context: "Security feature for student pickup flow.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 34,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ31",
    question_text: "Free trial -- how many days? What modules are available during trial? Is there a student count limit during trial?",
    topic: "Subscription & Business",
    priority: "must",
    context: "Trial configuration in Super Admin panel.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 35,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ32",
    question_text: "Pricing tiers -- can you share your planned pricing? (Bronze/Silver/Gold amounts, per-student rates, etc.)",
    topic: "Subscription & Business",
    priority: "must",
    context: "Need actual numbers for subscription enforcement logic and demo data.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 36,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ33",
    question_text: "When a school downgrades subscription and loses access to a module -- what happens to the data in that module? Hidden but retained? Or exportable?",
    topic: "Subscription & Business",
    priority: "should",
    context: "Module deactivation data handling policy.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 37,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ34",
    question_text: "School onboarding -- what information do you collect from a school when they sign up? Can you list ALL the fields?",
    topic: "Super Admin",
    priority: "must",
    context: "Onboarding wizard step-by-step design. Ask Manishbhai Q106 for EduNext's process.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 38,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ35",
    question_text: "Account Manager allocation -- what's the target ratio? 1 AM per 25 schools? 50? What's the threshold for heavy vs light support schools?",
    topic: "Super Admin",
    priority: "should",
    context: "AM dashboard workload metrics.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 39,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ36",
    question_text: "DPDP Act 2023 (India's data protection law) -- have you consulted a lawyer about compliance requirements? Any specific constraints we must follow?",
    topic: "Data & Compliance",
    priority: "must",
    context: "May require data deletion capability, consent management, data processing records.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 40,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ37",
    question_text: "Data backup -- should schools be able to download their own data (full export)? Or only Super Admin controls backups?",
    topic: "Data & Compliance",
    priority: "should",
    context: "Self-service data export vs admin-controlled backup.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 41,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ38",
    question_text: "Target launch date -- when do you want the MVP (Phase 1) ready for first pilot school?",
    topic: "Strategic",
    priority: "must",
    context: "Determines development sprint planning and priority trade-offs.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 42,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ39",
    question_text: "Pilot school -- do you have a specific school lined up for the pilot? What board/size/location?",
    topic: "Strategic",
    priority: "must",
    context: "Pilot school characteristics will influence which features to prioritize.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 43,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ40",
    question_text: "Competitor pricing -- do you know what EduNext, Fedena, or other competitors charge in India? Ballpark?",
    topic: "Strategic",
    priority: "should",
    context: "Pricing positioning against competition.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 44,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ41",
    question_text: "After architecture concludes, do you want to continue with Figma prompts module-by-module in the same order as the build order (Auth -> Master -> Student -> etc.)?",
    topic: "Strategic",
    priority: "should",
    context: "Figma prompt creation sequence planning.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 45,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ42",
    question_text: "Design inspiration -- besides EduNext, are there any other apps/websites whose UI/UX you admire and want us to take inspiration from?",
    topic: "Design & UX",
    priority: "should",
    context: "Design direction for Figma prompts.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 46,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ43",
    question_text: "Color scheme -- do you have brand colors for the ERP product? Or should the default theme be neutral (schools will white-label anyway)?",
    topic: "Design & UX",
    priority: "should",
    context: "Default theme design tokens for the UI component library.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 47,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ44",
    question_text: "Product name -- does the ERP have a name yet? Or is it still 'School ERP / SMS'?",
    topic: "Design & UX",
    priority: "nice",
    context: "Branding for login screens, emails, default theme.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 48,
    parent_question_id_ref: null
  },
  {
    question_id: "PQ45",
    question_text: "You mentioned 'several things to update' about the modules-functions-features file. What are those updates?",
    topic: "Features Review",
    priority: "must",
    context: "You said this right before the Manishbhai meeting. Need your corrections/additions.",
    cto_response: null,
    answer_status: "pending",
    answer_text: null,
    round: "New",
    sort_order: 49,
    parent_question_id_ref: null
  }
];

// ─── Manishbhai's 127 Questions ──────────────────────────────────────────────
const manishbhaiQuestions = [
  { question_id: "Q1", question_text: "What is the FIRST thing a principal opens in the ERP every morning?", topic: "Daily School Operations", priority: "must", context: "Determines our Principal Dashboard homepage layout", sort_order: 1 },
  { question_id: "Q2", question_text: "What is the FIRST thing a teacher does in the ERP daily?", topic: "Daily School Operations", priority: "must", context: "Determines Teacher Dashboard quick actions", sort_order: 2 },
  { question_id: "Q3", question_text: "What is the FIRST thing an admin does every morning?", topic: "Daily School Operations", priority: "must", context: "Determines Admin Dashboard homepage layout", sort_order: 3 },
  { question_id: "Q4", question_text: "Which 5 features do schools use MOST frequently in EduNext?", topic: "Daily School Operations", priority: "must", context: "These features must be perfect in our ERP -- no compromise", sort_order: 4 },
  { question_id: "Q5", question_text: "Which features did schools PAY for but NEVER actually use?", topic: "Daily School Operations", priority: "must", context: "Avoid building features nobody uses -- saves months of development", sort_order: 5 },
  { question_id: "Q6", question_text: "What's the typical school day workflow from opening to closing -- who does what in the ERP?", topic: "Daily School Operations", priority: "should", context: "Maps to our event-driven architecture -- which events fire when", sort_order: 6 },
  { question_id: "Q7", question_text: "How many staff members in a typical school actually log into the ERP daily vs. weekly vs. never?", topic: "Daily School Operations", priority: "should", context: "Helps estimate concurrent users for scaling", sort_order: 7 },
  { question_id: "Q8", question_text: "Does the school receptionist use the ERP? For what tasks?", topic: "Daily School Operations", priority: "should", context: "Receptionist is front office -- enquiry, visitor, phone calls", sort_order: 8 },
  { question_id: "Q9", question_text: "What time of day sees the highest ERP usage? Any peak hours that cause slowness?", topic: "Daily School Operations", priority: "nice", context: "Server scaling strategy -- attendance time is likely the peak", sort_order: 9 },
  { question_id: "Q10", question_text: "How do schools structure fees -- fixed per class, or broken into components (tuition + transport + lab + library separately)?", topic: "Fees Management", priority: "must", context: "Determines our fee data model -- single amount vs. component-based", sort_order: 10 },
  { question_id: "Q11", question_text: "Do schools change fee structure mid-year? How common is this?", topic: "Fees Management", priority: "must", context: "If yes, we need versioned fee structures", sort_order: 11 },
  { question_id: "Q12", question_text: "How do concessions/scholarships work? Percentage off or fixed amount? Who approves?", topic: "Fees Management", priority: "must", context: "Determines concession data model and approval workflow", sort_order: 12 },
  { question_id: "Q13", question_text: "Do parents pay partial fees? How is the remaining balance tracked?", topic: "Fees Management", priority: "must", context: "Partial payment logic is complex -- needs clear rules", sort_order: 13 },
  { question_id: "Q14", question_text: "What fields appear on a fee receipt? What do schools insist must be on it?", topic: "Fees Management", priority: "must", context: "Receipt template design -- regulatory requirements", sort_order: 14 },
  { question_id: "Q15", question_text: "Late fee -- flat amount or percentage of outstanding? Is there a grace period? Do schools actually enforce it?", topic: "Fees Management", priority: "must", context: "Late fee calculation rules", sort_order: 15 },
  { question_id: "Q16", question_text: "Sibling discount -- how common? Fixed amount off, percentage, or fee waiver on specific components?", topic: "Fees Management", priority: "must", context: "Ties into our family account model -- auto-apply sibling discount", sort_order: 16 },
  { question_id: "Q17", question_text: "Do parents pay advance fees (ahead of schedule)? How is the advance adjusted against future installments?", topic: "Fees Management", priority: "should", context: "Advance fee tracking -- EduNext PDF mentioned this", sort_order: 17 },
  { question_id: "Q18", question_text: "Do schools still use printed challans (bank payment slips)? Or has online payment replaced this?", topic: "Fees Management", priority: "should", context: "EduNext has challans -- do we need to build this?", sort_order: 18 },
  { question_id: "Q19", question_text: "E-NACH / auto-debit for recurring fees -- do parents adopt this? What percentage?", topic: "Fees Management", priority: "should", context: "Phase 2 payment gateway feature -- worth building?", sort_order: 19 },
  { question_id: "Q20", question_text: "What payment methods do parents use most? Cash, cheque, UPI, bank transfer, online?", topic: "Fees Management", priority: "must", context: "Payment entry form design -- which methods to support first", sort_order: 20 },
  { question_id: "Q21", question_text: "Fee defaulters -- how does the school handle them? Can they block exam results or report cards until fees are paid?", topic: "Fees Management", priority: "must", context: "Cross-module dependency: Fees -> Exam Results access", sort_order: 21 },
  { question_id: "Q22", question_text: "What fee reports does the accounts head review daily/weekly?", topic: "Fees Management", priority: "should", context: "Fee dashboard design", sort_order: 22 },
  { question_id: "Q23", question_text: "Transport fee -- is it a separate fee component or bundled? Does it change if the child changes route?", topic: "Fees Management", priority: "should", context: "Transport fee integration in Phase 2", sort_order: 23 },
  { question_id: "Q24", question_text: "What's the #1 pain point schools have with fee management in EduNext?", topic: "Fees Management", priority: "must", context: "Build our fee module to solve their biggest frustration", sort_order: 24 },
  { question_id: "Q25", question_text: "Walk me through the complete admission workflow -- from first parent contact to student enrolled. Every step.", topic: "Admission & Enquiry", priority: "must", context: "Our enquiry-to-admission flow must match real school processes", sort_order: 25 },
  { question_id: "Q26", question_text: "How many enquiries does a typical school get per admission season? Per month during off-season?", topic: "Admission & Enquiry", priority: "should", context: "Scale estimation for enquiry module", sort_order: 26 },
  { question_id: "Q27", question_text: "Do schools track enquiry source (walk-in, phone, website, referral, social media)? Do they care about this data?", topic: "Admission & Enquiry", priority: "should", context: "If nobody looks at source data, we can simplify Phase 1", sort_order: 27 },
  { question_id: "Q28", question_text: "Is there an entrance test / interview before admission? How is that managed in EduNext?", topic: "Admission & Enquiry", priority: "should", context: "May need an admission test scheduling feature", sort_order: 28 },
  { question_id: "Q29", question_text: "What documents are collected during admission? Is there a checklist?", topic: "Admission & Enquiry", priority: "must", context: "Document upload requirements for student registration form", sort_order: 29 },
  { question_id: "Q30", question_text: "Registration fee / admission fee -- is it separate from regular fees? Non-refundable?", topic: "Admission & Enquiry", priority: "should", context: "One-time fee vs. recurring fee distinction", sort_order: 30 },
  { question_id: "Q31", question_text: "Do schools have a waiting list? How is it managed?", topic: "Admission & Enquiry", priority: "should", context: "Waiting list feature in enquiry module", sort_order: 31 },
  { question_id: "Q32", question_text: "Transfer Certificate (TC) -- what information goes on it? Is there a standard format?", topic: "Admission & Enquiry", priority: "must", context: "TC template design -- regulatory requirement", sort_order: 32 },
  { question_id: "Q33", question_text: "What are the top 3 reasons students leave (TC issued)?", topic: "Admission & Enquiry", priority: "nice", context: "Dropout analytics for management dashboard", sort_order: 33 },
  { question_id: "Q34", question_text: "Mid-year admissions -- do schools accept students mid-year? How is that handled differently?", topic: "Admission & Enquiry", priority: "should", context: "Fee proration, class assignment for late joiners", sort_order: 34 },
  { question_id: "Q35", question_text: "How do teachers currently mark student attendance? Period-wise or once per day?", topic: "Attendance & Self-Punch", priority: "must", context: "Period-wise = much more data, different UI needed", sort_order: 35 },
  { question_id: "Q36", question_text: "What attendance types do schools use besides present/absent? (Late, half-day, medical, on-duty, etc.)", topic: "Attendance & Self-Punch", priority: "must", context: "Our attendance type system is school-configurable -- need to know defaults", sort_order: 36 },
  { question_id: "Q37", question_text: "How long does it take a teacher to mark attendance for one class in EduNext?", topic: "Attendance & Self-Punch", priority: "must", context: "Benchmark -- our UI must be faster. Target: under 30 seconds per class", sort_order: 37 },
  { question_id: "Q38", question_text: "Can a teacher edit attendance after submission? Is there an approval needed to edit?", topic: "Attendance & Self-Punch", priority: "should", context: "Attendance correction workflow", sort_order: 38 },
  { question_id: "Q39", question_text: "Employee self-attendance in EduNext -- what radius is set for geo-fencing? How accurate is GPS in practice?", topic: "Attendance & Self-Punch", priority: "must", context: "We're building geo-tagged self-attendance -- need practical numbers", sort_order: 39 },
  { question_id: "Q40", question_text: "Do employees try to fake GPS location? How does EduNext handle GPS spoofing?", topic: "Attendance & Self-Punch", priority: "must", context: "Anti-spoofing measures for our implementation", sort_order: 40 },
  { question_id: "Q41", question_text: "For field staff (transport head, external work) -- how does the approval flow work when they punch from outside?", topic: "Attendance & Self-Punch", priority: "should", context: "Remote punch approval flow design", sort_order: 41 },
  { question_id: "Q42", question_text: "Is there a time window for attendance? (e.g., mark before 9:30 AM or it auto-marks absent?)", topic: "Attendance & Self-Punch", priority: "should", context: "Auto-marking rules and time window configuration", sort_order: 42 },
  { question_id: "Q43", question_text: "Minimum attendance percentage for exam eligibility -- do schools enforce this via ERP?", topic: "Attendance & Self-Punch", priority: "should", context: "Cross-module: Attendance -> Exam eligibility check", sort_order: 43 },
  { question_id: "Q44", question_text: "Does EduNext send automatic absent notification to parents? At what time? How quickly after marking?", topic: "Attendance & Self-Punch", priority: "must", context: "Real-time attendance notification timing and format", sort_order: 44 },
  { question_id: "Q45", question_text: "What are ALL the fields in a student registration form? Which are mandatory vs optional?", topic: "Student Management", priority: "must", context: "Student registration form design -- must match what schools expect", sort_order: 45 },
  { question_id: "Q46", question_text: "Admission number format -- do schools have a specific pattern? Can they customize it?", topic: "Student Management", priority: "must", context: "Auto-generation logic for admission numbers", sort_order: 46 },
  { question_id: "Q47", question_text: "How does year-end student promotion work? Bulk promote entire class? Handle detained students?", topic: "Student Management", priority: "must", context: "Year rollover is a critical operation -- must be smooth", sort_order: 47 },
  { question_id: "Q48", question_text: "Section assignment -- who decides which student goes to which section? Is it random, merit-based, or manual?", topic: "Student Management", priority: "should", context: "Section assignment logic during promotion", sort_order: 48 },
  { question_id: "Q49", question_text: "Student ID card -- does the school generate it from the ERP? What info goes on it?", topic: "Student Management", priority: "should", context: "ID card template in admin dashboard", sort_order: 49 },
  { question_id: "Q50", question_text: "Student achievements & co-curricular records -- who enters this data? Teacher, admin, or student?", topic: "Student Management", priority: "should", context: "EduNext has this -- need to know if schools actually maintain it", sort_order: 50 },
  { question_id: "Q51", question_text: "Medical records -- what medical info do schools store? Allergies, blood group, doctor contact?", topic: "Student Management", priority: "should", context: "Medical section in student profile", sort_order: 51 },
  { question_id: "Q52", question_text: "Do students/parents actually use the student dashboard in EduNext? What do they check most?", topic: "Student Management", priority: "must", context: "Student dashboard widget priority", sort_order: 52 },
  { question_id: "Q53", question_text: "What self-service actions do students/parents want that EduNext doesn't provide?", topic: "Student Management", priority: "must", context: "Feature gap -- build what EduNext is missing", sort_order: 53 },
  { question_id: "Q54", question_text: "Student house/group system -- do schools assign students to houses (like Harry Potter)? Is this used for events/competitions?", topic: "Student Management", priority: "nice", context: "House system field in student profile", sort_order: 54 },
  { question_id: "Q55", question_text: "What are a teacher's top 5 daily tasks in the ERP? In order of frequency.", topic: "Teacher Dashboard", priority: "must", context: "Quick actions priority on teacher dashboard", sort_order: 55 },
  { question_id: "Q56", question_text: "How does homework assignment work in practice? Do teachers type it in ERP, or upload a photo of written homework?", topic: "Teacher Dashboard", priority: "must", context: "Homework creation UI -- text editor vs photo upload vs both", sort_order: 56 },
  { question_id: "Q57", question_text: "Do teachers resist using the ERP? What's the adoption challenge? What makes them stop using it?", topic: "Teacher Dashboard", priority: "must", context: "UX design -- must be so simple that teachers don't resist it", sort_order: 57 },
  { question_id: "Q58", question_text: "Teacher leave application -- how many days in advance? Who approves (principal, VP, HOD)?", topic: "Teacher Dashboard", priority: "should", context: "Leave approval workflow chain", sort_order: 58 },
  { question_id: "Q59", question_text: "Substitution management -- when a teacher is absent, how is a substitute assigned? Via ERP or manually?", topic: "Teacher Dashboard", priority: "should", context: "Substitute teacher feature in timetable module", sort_order: 59 },
  { question_id: "Q60", question_text: "Class teacher vs subject teacher -- different dashboard needs? What extra does a class teacher see?", topic: "Teacher Dashboard", priority: "should", context: "Role-specific teacher dashboard widgets", sort_order: 60 },
  { question_id: "Q61", question_text: "Marks entry -- do teachers enter marks in the ERP or on paper first then admin enters?", topic: "Teacher Dashboard", priority: "must", context: "Marks entry UX -- teacher-facing vs admin-facing", sort_order: 61 },
  { question_id: "Q62", question_text: "Do teachers use ERP on mobile or desktop? During class or after school?", topic: "Teacher Dashboard", priority: "must", context: "Mobile-first vs desktop-first design for teacher dashboard", sort_order: 62 },
  { question_id: "Q63", question_text: "PTM (Parent-Teacher Meeting) -- how does scheduling work? Time slots? Parent booking?", topic: "Teacher Dashboard", priority: "should", context: "PTM scheduling feature design", sort_order: 63 },
  { question_id: "Q64", question_text: "What reports does the principal actually print or review WEEKLY?", topic: "Principal & Reports", priority: "must", context: "Report priority -- build the most-used reports first", sort_order: 64 },
  { question_id: "Q65", question_text: "Do trustees/management actually log into the ERP? Or do they just receive WhatsApp/email summaries?", topic: "Principal & Reports", priority: "must", context: "Trustee dashboard -- full dashboard vs summary email", sort_order: 65 },
  { question_id: "Q66", question_text: "What data does the school present during CBSE/SQAAF inspections from the ERP?", topic: "Principal & Reports", priority: "must", context: "SQAAF compliance tracker -- must generate inspection-ready reports", sort_order: 66 },
  { question_id: "Q67", question_text: "Does the principal track syllabus completion? How? Subject-wise? Teacher-wise?", topic: "Principal & Reports", priority: "should", context: "Syllabus tracker widget in principal dashboard", sort_order: 67 },
  { question_id: "Q68", question_text: "Student strength report -- what breakdowns matter? Class-wise, gender-wise, category-wise?", topic: "Principal & Reports", priority: "should", context: "Student strength dashboard widget design", sort_order: 68 },
  { question_id: "Q69", question_text: "Does the principal use ERP for teacher evaluation/observation? Or is that done offline?", topic: "Principal & Reports", priority: "should", context: "Teacher performance module scope", sort_order: 69 },
  { question_id: "Q70", question_text: "Academic calendar -- who creates it? How far in advance? Does it change frequently?", topic: "Principal & Reports", priority: "should", context: "Academic calendar module design", sort_order: 70 },
  { question_id: "Q71", question_text: "Report card format -- is there a standard template all schools follow, or does each school customize their own?", topic: "Principal & Reports", priority: "must", context: "Report card template engine -- standard vs custom", sort_order: 71 },
  { question_id: "Q72", question_text: "What approval requests does the principal handle daily? (Leave, TC, fee concession, etc.)", topic: "Principal & Reports", priority: "should", context: "Approvals inbox design for principal dashboard", sort_order: 72 },
  { question_id: "Q73", question_text: "Exam schedule -- who creates it? Is there a standard process? Clash detection needed?", topic: "Principal & Reports", priority: "should", context: "Exam scheduling feature in LMS", sort_order: 73 },
  { question_id: "Q74", question_text: "What are parents' top 3 actions in the ERP app? What do they check most?", topic: "Parent App & Engagement", priority: "must", context: "Parent app homepage widget priority", sort_order: 74 },
  { question_id: "Q75", question_text: "Do parents prefer WhatsApp notifications or app push notifications? Which gets more engagement?", topic: "Parent App & Engagement", priority: "must", context: "Notification channel priority -- WhatsApp API investment worth it?", sort_order: 75 },
  { question_id: "Q76", question_text: "How tech-savvy are parents in tier-2/tier-3 city schools? Do they struggle with app navigation?", topic: "Parent App & Engagement", priority: "must", context: "UI complexity level -- must be simple enough for non-tech parents", sort_order: 76 },
  { question_id: "Q77", question_text: "Do parents actually check attendance notifications? What's the engagement rate?", topic: "Parent App & Engagement", priority: "should", context: "Is real-time attendance notification worth the infrastructure cost?", sort_order: 77 },
  { question_id: "Q78", question_text: "Parent complaints -- how do parents currently raise issues with the school? Via app, phone, in-person?", topic: "Parent App & Engagement", priority: "should", context: "Grievance system design", sort_order: 78 },
  { question_id: "Q79", question_text: "Do parents use the app to apply for student leave? Or do they still call/write a letter?", topic: "Parent App & Engagement", priority: "should", context: "Student leave application feature in parent app", sort_order: 79 },
  { question_id: "Q80", question_text: "School gallery (event photos) -- do parents actually use this? Is it a deal-maker or just decoration?", topic: "Parent App & Engagement", priority: "should", context: "EduNext has it -- worth building or skip?", sort_order: 80 },
  { question_id: "Q81", question_text: "Parent feedback on teachers/school -- do schools collect this via ERP? Anonymously?", topic: "Parent App & Engagement", priority: "nice", context: "Feedback/survey feature scope", sort_order: 81 },
  { question_id: "Q82", question_text: "Do both parents (mother + father) use the app? Or typically just one?", topic: "Parent App & Engagement", priority: "should", context: "Multi-parent access per student -- how many logins per family?", sort_order: 82 },
  { question_id: "Q83", question_text: "What language do parents prefer the app in? Hindi? Regional? English? Mix?", topic: "Parent App & Engagement", priority: "should", context: "Multi-language priority for parent app", sort_order: 83 },
  { question_id: "Q84", question_text: "Do teachers actually use LMS for homework, or do they still use WhatsApp groups / paper diary?", topic: "LMS & Academics", priority: "must", context: "If teachers don't use LMS, we need to understand WHY and fix it", sort_order: 84 },
  { question_id: "Q85", question_text: "Grading system -- what systems do schools use? (Marks, grades, GPA, CGPA, CCE?) Do they change often?", topic: "LMS & Academics", priority: "must", context: "Grading scale configuration -- must support all variations", sort_order: 85 },
  { question_id: "Q86", question_text: "Exam types -- what different exam types exist? (Unit test, midterm, final, practical, project, oral)", topic: "LMS & Academics", priority: "must", context: "Exam type configuration for test module", sort_order: 86 },
  { question_id: "Q87", question_text: "Do schools give students access to practice question banks? Via ERP or separate platform?", topic: "LMS & Academics", priority: "should", context: "Question bank access for students -- EduNext has this", sort_order: 87 },
  { question_id: "Q88", question_text: "Do schools upload e-learning content to ERP, or link to external platforms (YouTube, DIKSHA, etc.)?", topic: "LMS & Academics", priority: "should", context: "Content hosting vs external linking -- affects storage architecture", sort_order: 88 },
  { question_id: "Q89", question_text: "Result analysis -- do parents/teachers want comparative data? (Student vs class average, this term vs last term?)", topic: "LMS & Academics", priority: "should", context: "EduNext shows 'self-awareness insights' -- what does that mean in practice?", sort_order: 89 },
  { question_id: "Q90", question_text: "Lesson plan / syllabus tracking -- do teachers submit lesson plans? Does principal review them?", topic: "LMS & Academics", priority: "should", context: "Lesson plan submission feature in teacher dashboard", sort_order: 90 },
  { question_id: "Q91", question_text: "Co-scholastic activities -- grades for art, music, sports, life skills -- how is this handled?", topic: "LMS & Academics", priority: "nice", context: "Co-scholastic section on report card", sort_order: 91 },
  { question_id: "Q92", question_text: "In EduNext's WAPI module -- which WhatsApp API provider do most schools use? Wati? Galabox? Other?", topic: "Notifications & WhatsApp", priority: "must", context: "Priority provider integration for our WhatsApp dashboard", sort_order: 92 },
  { question_id: "Q93", question_text: "What are the most-used WhatsApp message templates? Which messages get sent most frequently?", topic: "Notifications & WhatsApp", priority: "must", context: "Readymade template library for our WAPI module", sort_order: 93 },
  { question_id: "Q94", question_text: "How much does a school spend monthly on WhatsApp API messages? Per message cost?", topic: "Notifications & WhatsApp", priority: "should", context: "Cost tracking feature in WhatsApp dashboard", sort_order: 94 },
  { question_id: "Q95", question_text: "SMS vs WhatsApp vs App notification -- which channel do parents respond to fastest?", topic: "Notifications & WhatsApp", priority: "must", context: "Notification channel priority and fallback strategy", sort_order: 95 },
  { question_id: "Q96", question_text: "Circular/notice distribution -- how does EduNext handle it? Class-wise? Individual? How does school confirm parents read it?", topic: "Notifications & WhatsApp", priority: "should", context: "Read receipt and acknowledgment feature", sort_order: 96 },
  { question_id: "Q97", question_text: "Emergency communication -- what's the fastest way a school currently alerts ALL parents? (Fire drill, lockdown, early dismissal)", topic: "Notifications & WhatsApp", priority: "must", context: "Critical notification system design -- our full-screen popup feature", sort_order: 97 },
  { question_id: "Q98", question_text: "Do schools send birthday wishes, festival greetings via ERP? Automated or manual?", topic: "Notifications & WhatsApp", priority: "nice", context: "Auto-trigger notification templates", sort_order: 98 },
  { question_id: "Q99", question_text: "Notification fatigue -- do parents complain about too many notifications? What's the right frequency?", topic: "Notifications & WhatsApp", priority: "should", context: "Notification throttling and batching strategy", sort_order: 99 },
  { question_id: "Q100", question_text: "Does EduNext have a visitor management module? How does it work?", topic: "Visitor & Security", priority: "must", context: "Compare with our visitor management design", sort_order: 100 },
  { question_id: "Q101", question_text: "Student pickup during school hours -- what's the current process in Manishbhai's school?", topic: "Visitor & Security", priority: "must", context: "Validate our bidirectional pickup flow against reality", sort_order: 101 },
  { question_id: "Q102", question_text: "Who is the gatekeeper? Dedicated security staff or multi-role? Do they have a dedicated device?", topic: "Visitor & Security", priority: "should", context: "Gatekeeper app UX -- dedicated device vs personal phone", sort_order: 102 },
  { question_id: "Q103", question_text: "Authorized pickup persons -- does the school maintain a list per student? ID verification?", topic: "Visitor & Security", priority: "should", context: "Authorized person management in student profile", sort_order: 103 },
  { question_id: "Q104", question_text: "School bus dismissal -- how does the school manage students going to buses vs parent pickup vs walking?", topic: "Visitor & Security", priority: "should", context: "End-of-day dismissal workflow", sort_order: 104 },
  { question_id: "Q105", question_text: "Security incidents -- do schools log incidents (fights, injuries, unauthorized entry) in the ERP?", topic: "Visitor & Security", priority: "nice", context: "Incident logging feature scope", sort_order: 105 },
  { question_id: "Q106", question_text: "School onboarding in EduNext -- how long does it take? What's the process? What data is collected?", topic: "Admin Operations", priority: "must", context: "Our Super Admin onboarding wizard design -- must be faster than competition", sort_order: 106 },
  { question_id: "Q107", question_text: "Data migration -- when a school switches to EduNext from another ERP/paper, how is old data imported?", topic: "Admin Operations", priority: "must", context: "Data migration tools in Super Admin panel", sort_order: 107 },
  { question_id: "Q108", question_text: "How many admin staff does a typical school dedicate to ERP operations?", topic: "Admin Operations", priority: "should", context: "Admin workload estimation", sort_order: 108 },
  { question_id: "Q109", question_text: "Academic year rollover -- is it smooth in EduNext or painful? What breaks?", topic: "Admin Operations", priority: "must", context: "Year rollover is a critical operation -- must get it right", sort_order: 109 },
  { question_id: "Q110", question_text: "School settings -- what are ALL the things a school admin configures when setting up the ERP?", topic: "Admin Operations", priority: "should", context: "School configuration page design", sort_order: 110 },
  { question_id: "Q111", question_text: "For school groups/chains -- what consolidated reports do they want across schools?", topic: "Multi-School / Groups", priority: "should", context: "Group Admin dashboard design", sort_order: 111 },
  { question_id: "Q112", question_text: "Do school groups share staff between branches? Transfer students between branches?", topic: "Multi-School / Groups", priority: "should", context: "Cross-school staff and student management", sort_order: 112 },
  { question_id: "Q113", question_text: "Do school groups want uniform fee structure across branches, or each branch sets their own?", topic: "Multi-School / Groups", priority: "should", context: "Group-level fee template vs branch-level customization", sort_order: 113 },
  { question_id: "Q114", question_text: "What percentage of schools in EduNext are standalone vs part of a group/chain?", topic: "Multi-School / Groups", priority: "nice", context: "Multi-school feature priority", sort_order: 114 },
  { question_id: "Q115", question_text: "What are the top 3 complaints schools have after 1 year of using EduNext?", topic: "Pain Points & Missing Features", priority: "must", context: "Build our ERP to solve these from day 1", sort_order: 115 },
  { question_id: "Q116", question_text: "What feature do schools request MOST that EduNext doesn't have?", topic: "Pain Points & Missing Features", priority: "must", context: "Our competitive advantage -- build what they can't", sort_order: 116 },
  { question_id: "Q117", question_text: "What makes a school LEAVE EduNext (churn)? Top reasons?", topic: "Pain Points & Missing Features", priority: "must", context: "Anti-churn strategy -- prevent the same reasons in our ERP", sort_order: 117 },
  { question_id: "Q118", question_text: "What's the deal-breaker feature -- the ONE feature without which schools won't even consider an ERP?", topic: "Pain Points & Missing Features", priority: "must", context: "Must-have for MVP launch", sort_order: 118 },
  { question_id: "Q119", question_text: "What pricing model do schools respond to best -- per student, flat fee, per module, combination?", topic: "Pain Points & Missing Features", priority: "must", context: "Validates our multi-dimensional subscription model", sort_order: 119 },
  { question_id: "Q120", question_text: "As a school admin yourself -- what frustrates YOU most about EduNext that you wish was better?", topic: "Pain Points & Missing Features", priority: "must", context: "Personal pain point from a real user -- most authentic feedback", sort_order: 120 },
  { question_id: "Q121", question_text: "What concession/scholarship types are most common in Indian schools? (e.g., sibling discount, staff-child discount, RTE, merit-based, financial hardship). What percentage ranges are typical?", topic: "Fees Management", priority: "must", context: "We're building ready-to-use concession templates for onboarding. Need real-world patterns.", sort_order: 121 },
  { question_id: "Q122", question_text: "How do schools typically handle late fees? Flat amount per day/month, percentage of outstanding, or both? Is there usually a grace period? How many days?", topic: "Fees Management", priority: "must", context: "We're building ready-to-use late fee templates for onboarding. Need real-world patterns.", sort_order: 122 },
  { question_id: "B1", question_text: "If AI could do ONE thing in the school ERP, what would be most valuable to a principal?", topic: "AI & Future", priority: "nice", context: "AI feature priority for Phase 2", sort_order: 123 },
  { question_id: "B2", question_text: "Would schools pay more for AI-powered features? (Auto-generated timetable, at-risk student detection, smart reports)", topic: "AI & Future", priority: "nice", context: "AI as premium tier differentiator", sort_order: 124 },
  { question_id: "B3", question_text: "Chatbot for parents -- would parents use an AI chatbot to ask questions instead of calling school? (Fee due, attendance, next PTM)", topic: "AI & Future", priority: "nice", context: "AI chatbot scope for Phase 2 support module", sort_order: 125 },
  { question_id: "B4", question_text: "Auto-generated report cards with AI insights -- would principals trust AI-written student remarks?", topic: "AI & Future", priority: "nice", context: "AI report card feature viability", sort_order: 126 },
  { question_id: "B5", question_text: "Predictive analytics -- 'Student X is at risk of failing Math' -- would schools act on this data?", topic: "AI & Future", priority: "nice", context: "At-risk student identification feature scope", sort_order: 127 }
];

// ─── Dhavalbhai's 35 Questions ───────────────────────────────────────────────
const dhavalbhaiQuestions = [
  {
    question_id: "DQ1",
    question_text: "CTO recommends Shared DB + Supabase RLS for multi-tenancy. We expect 500+ schools eventually. Do you agree, or do you see risks at scale that warrant separate schemas or separate databases?",
    topic: "Multi-Tenancy",
    priority: "must",
    context: "This is the #1 blocker. Every table design depends on this decision.\n\nOptions:\n(a) Shared DB + RLS -- Cheapest, simplest, cross-school reporting easy\n(b) Shared DB + Separate Schemas -- Better isolation, complex migrations\n(c) Separate DB per School -- Maximum isolation, highest cost",
    cto_response: "<strong>CTO Recommends: Option (a) Shared DB + RLS</strong><br>Supabase is built around RLS. Cross-school reporting trivial. Single migration path. Single connection pool. Cost stays low.<br><br><strong>Concerns to address:</strong> Noisy neighbor risk (see DQ4), RLS performance at scale (see DQ3).",
    sort_order: 1
  },
  {
    question_id: "DQ2",
    question_text: "If we go with shared DB + RLS, how should we structure the RLS policies? One policy per table, or a centralized policy helper? How do you handle RLS for cross-school queries (Super Admin, Group Admin)?",
    topic: "Multi-Tenancy",
    priority: "must",
    context: "3 access levels:\n- Single-school user: WHERE school_id = current_school()\n- Group Admin: WHERE school_id IN (assigned_schools)\n- Super Admin: no filter (see all)\n\nOptions:\n(a) Inline policies per table\n(b) Centralized helper function\n(c) Prisma middleware (bypass RLS)",
    cto_response: "<strong>CTO Analysis:</strong><br>(a) Repetitive but simple<br>(b) CREATE FUNCTION check_school_access() handling all 3 levels -- cleaner<br>(c) Application-level only -- loses DB-level protection",
    sort_order: 2
  },
  {
    question_id: "DQ3",
    question_text: "Performance concern: With 500+ schools in one DB and RLS on every query, have you seen or benchmarked RLS performance impact on Supabase/PostgreSQL? Any mitigation strategies?",
    topic: "Multi-Tenancy",
    priority: "must",
    context: "Real-time features + RLS + many concurrent connections.",
    cto_response: "<strong>4 Mitigations:</strong><br>1. Index school_id as leading column on every table<br>2. Cache JWT claims in session variables<br>3. Materialized views for heavy reports<br>4. PgBouncer connection pooling (Supabase default)",
    sort_order: 3
  },
  {
    question_id: "DQ4",
    question_text: "Noisy neighbor risk: If one school runs a heavy report (e.g., all students x all years), could it slow down other schools? How do we prevent this?",
    topic: "Multi-Tenancy",
    priority: "should",
    context: "Options:\n(1) Query timeouts (SET statement_timeout = '30s')\n(2) Read replicas for heavy reports\n(3) Per-school connection pool limits\n(4) Background jobs with async results",
    cto_response: "<strong>All 4 mitigations recommended.</strong> Phase 1: (1) + (4). Phase 2: add (2) read replicas when load justifies cost.",
    sort_order: 4
  },
  {
    question_id: "DQ5",
    question_text: "PM wants continuous data with academic_year_id tagging (Indian academic year: April-March). How should we implement this in Prisma schema? Composite indexes on (school_id, academic_year_id) for every transactional table?",
    topic: "Academic Year",
    priority: "must",
    context: "Every transactional record (attendance, fees, results, homework) will have academic_year_id.",
    cto_response: "<strong>Index strategy:</strong><br>1. INDEX (school_id, academic_year_id) on every transactional table<br>2. INDEX (school_id, academic_year_id, student_id) on attendance/fees<br>3. Academic year table: id, school_id, name, start_date, end_date, is_current",
    sort_order: 5
  },
  {
    question_id: "DQ6",
    question_text: "Year-end promotion/rollover: When academic year changes, students move to next class. Should this be a batch process or individual? How do you handle detained students, TC-issued students, new admissions simultaneously?",
    topic: "Academic Year",
    priority: "must",
    context: "Complex operation -- affects student records, fee records, class assignments, attendance reset.",
    cto_response: "<strong>5-step promotion wizard:</strong><br>1. Create new academic year<br>2. Auto-generate class\u2192next_class mapping<br>3. Admin reviews: mark detained, TC-issued<br>4. Batch create new enrollment records<br>5. Key principle: does NOT modify old records, creates NEW records",
    sort_order: 6
  },
  {
    question_id: "DQ7",
    question_text: "Should we use PostgreSQL table partitioning by academic year for large tables (attendance, results), or rely on indexes alone? At what data volume does partitioning become worth the complexity?",
    topic: "Academic Year",
    priority: "should",
    context: "500 schools x 2000 students x 8 periods x 200 days = 1.6B attendance rows/year.",
    cto_response: "<strong>Scale analysis:</strong><br>Attendance: 1.6B/year (HIGH partition benefit)<br>Fee Payments: ~6M (LOW)<br>Results: ~50M (MEDIUM)<br><br>Recommendation: Start with indexes, add partitioning on attendance at ~100M rows. Prisma doesn't natively support partitioning -- use raw SQL migrations.",
    sort_order: 7
  },
  {
    question_id: "DQ8",
    question_text: "What's your preferred pattern for using Prisma alongside Supabase? Prisma for schema/migrations + complex queries, Supabase client for auth/realtime/storage? Or Prisma for everything?",
    topic: "Prisma + Supabase",
    priority: "must",
    context: "Both connect to same PostgreSQL. Need clear separation.",
    cto_response: "<strong>Proposed split:</strong><br>Schema/Migrations = Prisma<br>CRUD = Prisma Client<br>Auth = Supabase Auth<br>Realtime = Supabase Realtime<br>Files = Supabase Storage<br>RLS = Raw SQL in Prisma migrations",
    sort_order: 8
  },
  {
    question_id: "DQ9",
    question_text: "Prisma doesn't natively support RLS. How do you handle this? Options: (a) Set session variables before queries, (b) Always include school_id in WHERE clauses via Prisma middleware, (c) Use raw SQL for RLS-dependent queries.",
    topic: "Prisma + Supabase",
    priority: "must",
    context: "Known Prisma + Supabase friction point.\n\nOptions:\n(a) SET session variables -- per-request connection, incompatible with pooling\n(b) Prisma middleware -- works with pooling, app-level filtering\n(c) Hybrid -- Prisma middleware (belt) + RLS (suspenders)",
    cto_response: "<strong>CTO leans toward (c) -- hybrid approach.</strong> Application-level filtering as primary, RLS as defense-in-depth safety net.",
    sort_order: 9
  },
  {
    question_id: "DQ10",
    question_text: "Database migrations: Prisma Migrate or Supabase Migrations? Both manage the same DB. Which one is source of truth for schema changes?",
    topic: "Prisma + Supabase",
    priority: "must",
    context: "Using both can cause conflicts. Need one source of truth.",
    cto_response: "<strong>Prisma Migrate = single source of truth.</strong><br>Exception: RLS policies, DB functions, triggers as raw SQL inside Prisma migration files.<br>Workflow: Edit schema.prisma \u2192 prisma migrate dev \u2192 commit \u2192 prisma migrate deploy",
    sort_order: 10
  },
  {
    question_id: "DQ11",
    question_text: "Based on the architecture in handoff.md, can you review and validate the core entity list? Core entities: School, User, Student, Staff, Parent, AcademicYear, Class, Section, Subject, FeeTemplate, FeeGroup, FeeComponent, FeeSchedule, FeePayment, Attendance, Assignment, Result, Visitor, Enquiry, Notification, Subscription, Permission, Profile.",
    topic: "Database Schema",
    priority: "must",
    context: "Once you validate, CTO will produce the full ERD with relationships and indexes.",
    cto_response: "<strong>Entity list by domain:</strong><br>Tenant (4): School, AcademicYear, Subscription, AuditLog<br>Auth (4): User, Profile, Permission, Session<br>People (3+): Student, Staff, Parent + junction tables<br>Academic (6): Class, Section, Subject, Timetable, TimetableSlot, ClassSubjectTeacher<br>Fees (7): FeeTemplate, FeeGroup, FeeComponent, FeeSchedule, FeeInstallment, FeePayment, Concession<br>Attendance (2): StudentAttendance, StaffAttendance<br>LMS (5): Assignment, Result, Exam, QuestionBank, ReportCard<br>Visitor (3): Visitor, VisitorLog, PickupRequest<br>Enquiry (2): Enquiry, EnquiryFollowUp<br>Notification (3): Notification, NotificationTemplate, NotificationLog<br>Platform (2): Subscription, Invoice",
    sort_order: 11
  },
  {
    question_id: "DQ12",
    question_text: "JSONB metadata columns on core entities (Student, Staff, Fee, School) for custom fields -- do you have concerns about query performance, indexing, or migration complexity with GIN indexes?",
    topic: "Database Schema",
    priority: "should",
    context: "Schools can add custom fields without schema changes. Phase 2/3 No-Code Studio builds on this.",
    cto_response: "<strong>Use GIN indexes on JSONB columns.</strong><br>Concerns addressed:<br>1. GIN index update speed: slower than B-tree but acceptable for read-heavy workload<br>2. Nested JSONB querying: use jsonb_path_query for deep nesting<br>3. No schema validation: validate at application level (Zod)<br>4. Non-breaking migration: add JSONB column with DEFAULT '{}'",
    sort_order: 12
  },
  {
    question_id: "DQ13",
    question_text: "UUID vs auto-increment for primary keys? CTO recommends UUID (Supabase default, no collision risk in multi-tenant, better for distributed systems). Any concerns?",
    topic: "Database Schema",
    priority: "should",
    context: "UUIDs are larger (16 bytes vs 4) but safer for multi-tenant.",
    cto_response: "<strong>UUID everywhere.</strong> Reasons: no collision in multi-tenant, no information leakage (can't guess next ID), Supabase default, better for future distributed setup.<br><br>Alternative: ULID for tables where sortable insert order matters (logs, notifications).",
    sort_order: 13
  },
  {
    question_id: "DQ14",
    question_text: "API style: REST with resource-based endpoints, or tRPC for end-to-end type safety with Next.js? Or a hybrid?",
    topic: "API Design",
    priority: "must",
    context: "tRPC = amazing DX with TypeScript but locks to Next.js. REST = universal but manual type sync. Currently Next.js-only.\n\nOptions:\n- tRPC: end-to-end type safety, great DX\n- REST: universal, mobile-friendly, cacheable\n- Hybrid: tRPC for web, REST for mobile/external",
    cto_response: "<strong>Key insight:</strong> Capacitor wraps Next.js, so tRPC would work for mobile too. Only an issue if we build standalone native app (Phase 3+).",
    sort_order: 14
  },
  {
    question_id: "DQ15",
    question_text: "API versioning strategy: URL-based (/api/v1/students), header-based, or no versioning (force everyone to update)?",
    topic: "API Design",
    priority: "should",
    context: "Capacitor mobile app may lag behind web updates.",
    cto_response: "If tRPC, versioning less critical (type errors catch breaking changes). If REST, URL-based is simplest. For Capacitor, versioning only matters with standalone native app (Phase 3+).",
    sort_order: 15
  },
  {
    question_id: "DQ16",
    question_text: "Rate limiting: Per-user, per-school, or both? What limits would you recommend for different endpoint types (read vs write vs bulk)?",
    topic: "API Design",
    priority: "should",
    context: "Prevent abuse in multi-tenant setup.",
    cto_response: "<strong>Proposed limits:</strong><br>Read: 100/min per user, 1000/min per school<br>Write: 30/min per user, 300/min per school<br>Auth: 5/min per user, 50/min per school<br>Bulk: 5/min per user, 20/min per school<br>File upload: 10/min per user, 100/min per school<br><br>Implementation: Redis sliding window counter (Upstash).",
    sort_order: 16
  },
  {
    question_id: "DQ17",
    question_text: "Supabase Realtime: We plan to use Postgres Changes for attendance/fees and Broadcast for notifications. At 500 schools x ~100 concurrent connections each = 50,000 connections. What Supabase tier/plan do we need?",
    topic: "Real-Time & Performance",
    priority: "must",
    context: "Free = 200 concurrent. Pro = 10,000. May need Enterprise or dedicated WebSocket.",
    cto_response: "<strong>Phase-wise scaling:</strong><br>Phase 1 (5-10 schools): Supabase Pro sufficient<br>Phase 2 (50 schools): May need Enterprise or hybrid<br>Phase 3 (500 schools): Dedicated WebSocket service likely<br><br>Alternatives: Ably/Pusher, self-hosted Socket.io, hybrid approach.",
    sort_order: 17
  },
  {
    question_id: "DQ18",
    question_text: "Server-side caching strategy: Redis, in-memory (Node.js Map), or Supabase edge functions cache? What should we cache?",
    topic: "Real-Time & Performance",
    priority: "should",
    context: "Permission checks on every API call. 4 high-frequency lookups to cache.",
    cto_response: "<strong>Cache targets:</strong> Permission matrix, school config, subscription status, academic year config.<br><br>Comparison:<br>In-memory: 0ms, free, lost on restart<br>Redis/Upstash: 1ms, $10-50/mo, persistent<br>Edge cache: 5ms, free, edge-local",
    sort_order: 18
  },
  {
    question_id: "DQ19",
    question_text: "Connection pooling: Supabase provides PgBouncer. Are the default pool settings sufficient, or do we need to tune for our expected load?",
    topic: "Real-Time & Performance",
    priority: "should",
    context: "Each API request opens a DB connection. Peak = morning attendance.",
    cto_response: "Supabase Pro default = ~60 connections. Effective capacity: ~1200 queries/sec. Sufficient for 50 schools. At 500 schools: need to tune or upgrade to dedicated instance.",
    sort_order: 19
  },
  {
    question_id: "DQ20",
    question_text: "Module boundary enforcement: ESLint boundaries plugin, TypeScript project references, Nx module boundaries, or Turborepo + package.json exports?",
    topic: "Module Architecture",
    priority: "must",
    context: "#1 rule of modular monolith: modules cannot import from each other's internals. Must be enforced automatically.",
    cto_response: "handoff.md specifies Turborepo or Nx -- developer decides. All 4 options are valid. Key: must be CI-enforced, not just convention.",
    sort_order: 20
  },
  {
    question_id: "DQ21",
    question_text: "Event bus implementation: Node.js EventEmitter, EventEmitter2, DB-backed event table, Supabase Realtime Broadcast, or BullMQ (Redis)?",
    topic: "Module Architecture",
    priority: "must",
    context: "Events drive inter-module communication. student.enrolled \u2192 fees creates record, auth creates login. If event missed \u2192 data inconsistency.",
    cto_response: "<strong>Data consistency concern:</strong> If listener fails, event is lost with in-memory solutions. DB-backed or BullMQ provide retry capability. Consider: how critical is guaranteed delivery?",
    sort_order: 21
  },
  {
    question_id: "DQ22",
    question_text: "Shared packages (approval workflow, notification system) -- npm workspaces, just folders, or internal Turborepo packages?",
    topic: "Module Architecture",
    priority: "should",
    context: "packages/api/shared/ contains approval workflow engine, notification channels, etc.",
    cto_response: "Options:<br>(a) Just folders: simplest, no versioning, unclear boundaries<br>(b) npm workspaces: each has package.json, clear boundaries<br>(c) Turborepo internal packages: no publishing, proper isolation",
    sort_order: 22
  },
  {
    question_id: "DQ23",
    question_text: "Testing approach: What's the minimum viable testing strategy for Phase 1?",
    topic: "Testing Strategy",
    priority: "must",
    context: "Small team, can't test everything. Need to prioritize.",
    cto_response: "<strong>Priority:</strong><br>Unit: fee calculation, permissions (Vitest)<br>Integration: auth flow, enrollment pipeline (Vitest+Supertest)<br>E2E: login\u2192attendance\u2192notification (Playwright)<br><br>Skip: UI component tests, snapshot tests, load testing<br><br>Rule: <em>\"Test the money (fees) and the security (auth/permissions).\"</em>",
    sort_order: 23
  },
  {
    question_id: "DQ24",
    question_text: "How do you handle test data in a multi-tenant setup? Seed a test school? Factories? How to isolate from production?",
    topic: "Testing Strategy",
    priority: "should",
    context: "Tests need realistic multi-tenant data.",
    cto_response: "Recommendation: Factory pattern (createTestSchool(), createTestStudent()) + separate test database. Never test against production data.",
    sort_order: 24
  },
  {
    question_id: "DQ25",
    question_text: "CI/CD pipeline: GitHub Actions, Vercel, or something else? How to handle monorepo builds where only changed packages rebuild?",
    topic: "DevOps & Deployment",
    priority: "should",
    context: "Turborepo/Nx handle build caching.",
    cto_response: "Proposed: CI=GitHub Actions, CD=Vercel, Monorepo=Turborepo filtered builds, DB=prisma migrate deploy in CI.",
    sort_order: 25
  },
  {
    question_id: "DQ26",
    question_text: "Environment strategy: How many environments? (local \u2192 staging \u2192 production) Should staging mirror production data?",
    topic: "DevOps & Deployment",
    priority: "should",
    context: "Multi-tenant staging is tricky.",
    cto_response: "3 environments:<br>Local: Supabase Docker<br>Staging: separate Supabase free tier<br>Production: Supabase Pro<br><br>Staging data: seed script with 3 demo schools, NOT anonymized production.",
    sort_order: 26
  },
  {
    question_id: "DQ27",
    question_text: "Deployment strategy: Blue-green, rolling, or canary? Downtime during school hours (8am-3pm IST) is unacceptable.",
    topic: "DevOps & Deployment",
    priority: "should",
    context: "Vercel handles Next.js. Real risk = DB migrations.",
    cto_response: "Vercel = zero-downtime (blue-green automatic). Real risk = DB migrations. Strategy: two-phase deployment (deploy backward-compatible code first, then migration, then new code).",
    sort_order: 27
  },
  {
    question_id: "DQ28",
    question_text: "Supabase RLS is our primary data isolation. Should we add application-level checks as defense-in-depth?",
    topic: "Security & Compliance",
    priority: "must",
    context: "CTO recommends both -- belt and suspenders for children's data.",
    cto_response: "<strong>Triple-layer security:</strong><br>Layer 1: RLS (school_id isolation at DB level)<br>Layer 2: Prisma middleware (catches bypassed RLS)<br>Layer 3: API validation (catches URL tampering)<br><br>Rationale: protecting children's data -- no single point of failure.",
    sort_order: 28
  },
  {
    question_id: "DQ29",
    question_text: "Sensitive data encryption: Should we encrypt PII (parent phone, email, Aadhaar if stored) at application level in addition to PostgreSQL's at-rest encryption?",
    topic: "Security & Compliance",
    priority: "should",
    context: "DPDP Act 2023 may require this.",
    cto_response: "Phase 1: Rely on Supabase at-rest encryption + TLS in transit.<br>Phase 2: Add application-level encryption for Aadhaar after legal consultation.<br><br>Reason: ALE adds search/index complexity. Not needed until Aadhaar is stored.",
    sort_order: 29
  },
  {
    question_id: "DQ30",
    question_text: "API security: JWT + RLS + rate limiting. Anything else? CORS, request signing, IP whitelisting for Super Admin?",
    topic: "Security & Compliance",
    priority: "should",
    context: "Standard OWASP + multi-tenant concerns.",
    cto_response: "<strong>Phase 1 checklist:</strong><br>1. JWT validation<br>2. RLS<br>3. Rate limiting<br>4. CORS policy<br>5. Input validation (Zod)<br>6. CSRF protection<br>7. File upload validation (Phase 2)<br>8. Audit logging (Phase 2)<br><br>Nice-to-have: IP whitelisting, request signing, Helmet.js",
    sort_order: 30
  },
  {
    question_id: "DQ31",
    question_text: "Capacitor wrapping Next.js for mobile -- any known pain points? Especially with Supabase Realtime on mobile.",
    topic: "Mobile (Capacitor)",
    priority: "must",
    context: "Phase 1 mobile is Capacitor. Need to know blockers now.",
    cto_response: "<strong>5 known concerns:</strong><br>1. WebView performance: need virtualization for large lists<br>2. Realtime/WebSocket: iOS kills after ~30s background<br>3. Battery drain: disconnect on background<br>4. Deep linking setup<br>5. Hot reload via Capacitor Live Updates",
    sort_order: 31
  },
  {
    question_id: "DQ32",
    question_text: "Push notifications: Capacitor Push Notifications plugin + FCM? Or Supabase's upcoming push support?",
    topic: "Mobile (Capacitor)",
    priority: "should",
    context: "Parents need push for attendance, fees, emergencies.",
    cto_response: "Capacitor + FCM for Phase 1 (mature, documented). Supabase Push not production-ready.<br><br>Architecture: event \u2192 DB \u2192 Supabase Realtime (in-app) + FCM (mobile push) + email/SMS/WhatsApp",
    sort_order: 32
  },
  {
    question_id: "DQ33",
    question_text: "Offline support is Phase 2, but should we architect for it now? (Service workers, local DB like WatermelonDB)",
    topic: "Mobile (Capacitor)",
    priority: "should",
    context: "Retrofitting offline later is painful if not planned.",
    cto_response: "<strong>Phase 1 prep:</strong> cacheable API responses, SWR/TanStack Query with staleWhileRevalidate, state management ready for local DB.<br><strong>Phase 2:</strong> WatermelonDB/RxDB, conflict resolution, service workers.",
    sort_order: 33
  },
  {
    question_id: "DQ34",
    question_text: "Given the architecture in handoff.md, what's your rough estimate for Phase 1 MVP? (11 modules: Auth, Super Admin, Student, Teacher, Fees, Principal, Admin, LMS, Enquiry, Visitor, User Account)",
    topic: "Estimation & Approach",
    priority: "must",
    context: "PM needs this for planning. Developer uses Claude Code as pair programmer.",
    cto_response: "<strong>Build order:</strong> Auth \u2192 Super Admin \u2192 Student \u2192 Teacher \u2192 Fees \u2192 Principal \u2192 Admin \u2192 LMS \u2192 Enquiry \u2192 Visitor \u2192 User Account<br><br>Factors: part-time developer, Claude Code multiplier, Supabase reducing custom backend work.",
    sort_order: 34
  },
  {
    question_id: "DQ35",
    question_text: "Your preferred development workflow with Claude Code -- Claude generates boilerplate and you review? You write core logic and Claude handles tests? Or spec-driven full implementation?",
    topic: "Estimation & Approach",
    priority: "must",
    context: "Optimizing human+AI workflow for 2-3M LOC target.",
    cto_response: "<strong>Options:</strong><br>(a) Scaffold & Review: Claude generates, human reviews<br>(b) Core & Assist: Human writes logic, Claude tests/utilities<br>(c) Spec & Implement: Human specs, Claude implements, human reviews<br>(d) Pair Programming: Human architecture, Claude suggestions/completion<br><br>Context files for Claude Code: handoff.md + hardcode.md + module spec",
    sort_order: 35
  }
];

// ─── Main Seed Function ──────────────────────────────────────────────────────
async function seed() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL.');

    // Step 1: Clear existing qa_questions for this project
    console.log('\n--- Step 1: Clearing existing qa_questions for project ---');
    const deleteResult = await client.query(
      'DELETE FROM qa_questions WHERE project_id = $1',
      [PROJECT_ID]
    );
    console.log(`Deleted ${deleteResult.rowCount} existing rows.`);

    // Step 2: Prepare all questions with assigned_to UUIDs
    const allQuestions = [
      ...piushQuestions.map(q => ({ ...q, assigned_to: USERS.Piush })),
      ...manishbhaiQuestions.map(q => ({ ...q, assigned_to: USERS.Manishbhai })),
      ...dhavalbhaiQuestions.map(q => ({ ...q, assigned_to: USERS.Dhavalbhai }))
    ];

    console.log(`\n--- Step 2: Inserting ${allQuestions.length} questions ---`);

    // Insert in batches of 20
    const BATCH_SIZE = 20;
    let insertedCount = 0;

    for (let i = 0; i < allQuestions.length; i += BATCH_SIZE) {
      const batch = allQuestions.slice(i, i + BATCH_SIZE);

      for (const q of batch) {
        const answeredAt = q.answer_status === 'answered' ? 'now()' : null;

        await client.query(
          `INSERT INTO qa_questions (
            project_id, question_id, question_text, topic, priority,
            assigned_to, context, cto_response, answer_text, answer_status,
            deferred_to, deferred_note, round, sort_order, answered_at
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13, $14, ${answeredAt ? 'now()' : 'NULL'}
          )`,
          [
            PROJECT_ID,
            q.question_id,
            q.question_text,
            q.topic,
            q.priority || 'should',
            q.assigned_to,
            q.context || null,
            q.cto_response || null,
            q.answer_text || null,
            q.answer_status || 'pending',
            q.deferred_to || null,
            q.deferred_note || null,
            q.round || null,
            q.sort_order
          ]
        );
        insertedCount++;
      }

      console.log(`  Inserted ${insertedCount}/${allQuestions.length} questions...`);
    }

    console.log(`\nAll ${insertedCount} questions inserted successfully.`);

    // Step 3: Resolve parent_question_id references
    console.log('\n--- Step 3: Resolving parent_question_id references ---');

    const followUps = [
      { child: 'PQ1a', parent: 'PQ1' },
      { child: 'PQ1b', parent: 'PQ1' },
      { child: 'PQ1c', parent: 'PQ1' },
      { child: 'PQ1d', parent: 'PQ1' }
    ];

    for (const { child, parent } of followUps) {
      const result = await client.query(
        `UPDATE qa_questions
         SET parent_question_id = (
           SELECT id FROM qa_questions
           WHERE project_id = $1 AND question_id = $2
         )
         WHERE project_id = $1 AND question_id = $3`,
        [PROJECT_ID, parent, child]
      );
      console.log(`  ${child} -> parent ${parent}: ${result.rowCount} row(s) updated`);
    }

    // Step 4: Verify counts
    console.log('\n--- Step 4: Verification ---');
    const countResult = await client.query(
      'SELECT COUNT(*) as total FROM qa_questions WHERE project_id = $1',
      [PROJECT_ID]
    );
    console.log(`Total questions in DB: ${countResult.rows[0].total}`);

    const byAssignee = await client.query(
      `SELECT assigned_to, COUNT(*) as count
       FROM qa_questions
       WHERE project_id = $1
       GROUP BY assigned_to
       ORDER BY count DESC`,
      [PROJECT_ID]
    );
    const nameMap = {
      [USERS.Piush]: 'Piush',
      [USERS.Manishbhai]: 'Manishbhai',
      [USERS.Dhavalbhai]: 'Dhavalbhai'
    };
    console.log('\nBy assignee:');
    for (const row of byAssignee.rows) {
      console.log(`  ${nameMap[row.assigned_to] || row.assigned_to}: ${row.count} questions`);
    }

    const byStatus = await client.query(
      `SELECT answer_status, COUNT(*) as count
       FROM qa_questions
       WHERE project_id = $1
       GROUP BY answer_status
       ORDER BY count DESC`,
      [PROJECT_ID]
    );
    console.log('\nBy status:');
    for (const row of byStatus.rows) {
      console.log(`  ${row.answer_status}: ${row.count}`);
    }

    const parentCheck = await client.query(
      `SELECT question_id, parent_question_id IS NOT NULL as has_parent
       FROM qa_questions
       WHERE project_id = $1 AND question_id IN ('PQ1a', 'PQ1b', 'PQ1c', 'PQ1d')`,
      [PROJECT_ID]
    );
    console.log('\nParent references:');
    for (const row of parentCheck.rows) {
      console.log(`  ${row.question_id}: parent_set=${row.has_parent}`);
    }

    console.log('\n=== SEED COMPLETE ===');

  } catch (err) {
    console.error('Error during seed:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Database connection closed.');
  }
}

seed();
