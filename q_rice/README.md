# Q_Rice — Instructor-Led Quiz Management System

> **Tagline:** Smart Assessments. Secure Quizzes. Meaningful Results.  
> **Application Version:** 1.0.0 Production-Ready Architecture

---

## 🎯 Executive Overview

**Q_Rice** is an enterprise-grade, online assessment platform built for educational institutions, university departments, and training cohorts. It empowers instructors to author rich multi-type assessments, bulk-import multiple-choice questions via strict CSV schemas, conduct synchronized instructor-led live sessions via WebSockets, monitor candidate integrity in real time, evaluate submissions authoritatively on the server, and export performance reports to verified PDF and sanitised CSV formats.

---

## 🛠️ Technology Stack & Architecture

- **Frontend & Fullstack Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server Actions & Dynamic Route Handlers) with [React 18](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/).
- **Styling & Design System:** [Tailwind CSS](https://tailwindcss.com/) with accessible high-contrast blue/indigo educational SaaS branding, glassmorphism telemetry cards, and Lucide Icons.
- **Database & ORM:** [Prisma ORM](https://www.prisma.io/) with normalized schema (`User`, `Class`, `Question`, `Option`, `Quiz`, `QuizQuestion`, `QuizSession`, `QuizAttempt`, `StudentResponse`, `IntegrityEvent`, `AuditLog`).
  - *Default Local Development:* Zero-setup SQLite (`file:./dev.db`).
  - *Production Support:* Fully compatible with PostgreSQL (configuration included in `.env.example`).
- **Real-Time Communication:** Dedicated Node HTTP server (`server.js`) mounting Next.js alongside high-throughput WebSockets (`ws`) on `/api/ws` for live synchronization and telemetry.
- **CSV Engine:** Schema validator built on `PapaParse` with UTF-8 support, column mapping, multiline field parsing, duplicate detection, and row-level validation.
- **PDF Generation:** Server-side vector PDF generation using `PDFKit` for both individual student result transcripts and aggregate class performance summaries.
- **Security & Authorization:** Server-managed HttpOnly JWT session cookies (`jsonwebtoken`), bcrypt password hashing (`bcryptjs`), Formula Injection Protection (`CWE-1236`) on CSV exports, and client-clock bypass defense.
- **Automated Testing:** [Vitest](https://vitest.dev/) automated test suite covering CSV parsing, authoritative scoring edge cases, and RBAC authorization boundaries.

---

## 👥 Role-Based Access Control & Demo Accounts

The database comes pre-seeded with realistic institutional roles and test data:

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@qrice.edu` | `Password123!` | System statistics, user activation/suspension, audit trail inspection |
| **Instructor** | `instructor@qrice.edu` | `Password123!` | Quiz builder, CSV imports, Question Bank, Live sessions, Analytics, PDF/CSV exports |
| **Student 1** | `alex.rivera@student.qrice.edu` | `Password123!` | Access code join, Live session participation, Exam interface, Result review |
| **Student 2** | `priya.sharma@student.qrice.edu` | `Password123!` | Candidate enrolled in CS401-2026 |
| **Student 3** | `marcus.chen@student.qrice.edu` | `Password123!` | Candidate enrolled in CS401-2026 |

*Note: Quick 1-click credential fill buttons are provided on the `/login` screen for rapid local testing.*

---

## ⚡ Core Feature Matrix

### 1. CSV MCQ Import Wizard (`/instructor/import-csv`)
- Strictly adheres to the required header format:
  ```csv
  question,type,option_a,option_b,option_c,option_d,correct_answer,marks,negative_marks,explanation
  ```
- **Live Template Download:** One-click download of `q_rice_mcq_template.csv` and rich sample data `q_rice_mcq_sample.csv`.
- **Validation Engine:** Checks required headers, question type validity (`single_choice`, `multiple_choice`, `true_false`), option presence, answer keys (`A`, `B`, `C`, `D` or `A|C`), and auto-heals common true/false comma shift anomalies.
- **Preview & Error Reporting:** Visual staging table showing validated questions and detailed row-level error reporting before committing to the database.

### 2. Guided 6-Step Quiz Creation Wizard (`/instructor/quizzes/new`)
- **Step 1: Basic Information:** Title, subject, course cohort, description, and candidate instructions.
- **Step 2: Questions:** Reorder, duplicate, add manually, pick from Question Bank, or import CSV.
- **Step 3: Scoring Rules:** Marks per question, negative marking (-0.25, -0.5, etc.), passing percentage, and partial credit policies.
- **Step 4: Timing & Availability:** Overall time limit in minutes, deadline enforcement, and late-join policy.
- **Step 5: Exam Integrity:** Configure tab-switch limits, focus loss monitoring, optional fullscreen requirement, and auto-submit thresholds.
- **Step 6: Review & Publish:** Comprehensive configuration validation summary before publishing.

### 3. Instructor-Led Live Assessment Mode (`/instructor/live/[sessionId]`)
- Real-time room orchestration over WebSockets (`/api/ws`).
- **6-Digit Session Code:** Large PIN display for classroom projectors and invitation links.
- **Host Controls:** Next question, previous question, reveal live answers, and end session.
- **Live Telemetry & Proctoring:** Real-time roster of connected candidates, question completion rates, and instantaneous integrity alert popups if candidates leave the exam tab.

### 4. Student Examination Interface (`/student/exam/[attemptId]`)
- **Server-Authoritative Countdown Timer:** Visual warning states (amber under 5 minutes, pulsing red under 1 minute) and automatic submission when time expires.
- **Question Palette & Navigation:** Grid indicating answered (green), unanswered (slate), flagged (amber), and current question.
- **Debounced Autosave:** Responses persist instantly to the server (`/api/student/attempt/[id]/save`) with a visual "Saved" checkmark and seamless recovery across page reloads.
- **Client-Side Answer Security:** Answer keys and explanations are stripped from the payload during the examination to prevent browser inspection cheating.
- **Integrity Monitoring:** Browser Page Visibility API and window blur listeners track tab switching. Exceeding violation thresholds triggers automatic exam lock and submission.

### 5. Analytics, Reporting & Exports (`/instructor/results/[quizId]`)
- **Class Analytics:** Total attempts, average score, pass percentage, and score distributions.
- **Question Accuracy Breakdown:** Identifies hardest questions and common misconceptions.
- **Export to CSV:** Fully sanitized against CSV formula injection (`=`, `+`, `-`, `@`).
- **Export to PDF:** Branded high-resolution PDF generation with candidate scorecards, grading badges, and question-by-question analysis.

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- Node.js (v18.17+ or v20+)
- npm or pnpm

### 2. Installation
```bash
# Clone or navigate to the project directory
cd q_rice

# Install dependencies
npm install
```

### 3. Database Initialization & Seeding
```bash
# Push database schema to local SQLite database (dev.db)
npm run prisma:push

# Seed initial classes, demo accounts, quizzes, and sample submissions
npm run seed
```

### 4. Run Automated Tests
```bash
# Run Vitest test suite
npm test
```

### 5. Start the Application Server
```bash
# Build the production bundle
npm run build

# Start the unified HTTP & WebSocket server
npm start
```
*The server will start at `http://localhost:3000`.*

---

## 🧪 Automated Test Coverage

The test suite (`npm test`) verifies all critical backend calculations:
1. `csv-parser.test.ts`:
   - Validates sample template and standard format.
   - Detects missing required headers and invalid question types.
   - Parses multi-answer questions (`A|C`) and handles commas inside quotes.
   - Auto-heals true/false column shifts.
2. `scoring.test.ts`:
   - Single-choice scoring with positive marks.
   - Negative marking deduction for incorrect answers.
   - Partial credit proportional calculation for multiple-choice questions.
   - Overall percentage and pass/fail boundary determination.
3. `auth.test.ts`:
   - JWT session signing, verification, and tamper detection.
   - Strict Role-Based Access Control (Admin, Instructor, Student) isolation.

---

## 🔒 Security Best Practices Implemented

1. **HttpOnly Cookies:** Authentication tokens are stored in HttpOnly, SameSite cookies to protect against XSS token theft.
2. **Authoritative Server Scoring:** Scoring and timers are calculated exclusively on the server. Client-side clocks are never trusted.
3. **Privileged Key Stripping:** Answer keys and explanations are omitted from the student API payload until results are officially released.
4. **Formula Injection Sanitization:** CSV exports prefix formula characters (`=`, `+`, `-`, `@`, `\t`) with single quotes to protect Microsoft Excel and Google Sheets users.
5. **Proctoring Transparency:** Students receive clear integrity warning dialogs showing violation counters before automated penalties take effect.

---

## 📄 License
MIT License. Developed for educational excellence and high-integrity online assessments.
