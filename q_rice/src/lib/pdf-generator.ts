import PDFDocument from 'pdfkit';

export interface StudentReportData {
  quizTitle: string;
  subject: string;
  studentName: string;
  studentEmail: string;
  instructorName: string;
  attemptNumber: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeSpentSeconds: number;
  integrityEventCount: number;
  submittedAt: Date | string;
  questions: Array<{
    qNum: number;
    statement: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    marksAwarded: number;
    maxMarks: number;
    explanation?: string;
  }>;
}

export interface ClassReportData {
  quizTitle: string;
  subject: string;
  className: string;
  instructorName: string;
  totalParticipants: number;
  completedAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passPercentage: number;
  results: Array<{
    studentName: string;
    email: string;
    score: number;
    maxScore: number;
    percentage: number;
    isPassed: boolean;
    integrityViolations: number;
  }>;
}

export function generateStudentReportPdf(data: StudentReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header banner with Q_Rice branding
    doc.rect(40, 40, 515, 65).fill('#1e40af'); // Deep Blue

    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('Q_Rice', 55, 52);
    doc.fontSize(10).font('Helvetica').text('Instructor-Led Quiz Management System', 135, 62);
    doc.fontSize(8).fillColor('#bfdbfe').text('Smart Assessments. Secure Quizzes. Meaningful Results.', 55, 82);

    doc.moveDown(3);

    // Assessment & Student Details
    doc.fillColor('#111827').fontSize(16).font('Helvetica-Bold').text(data.quizTitle, 40, 125);
    doc.fontSize(10).font('Helvetica').fillColor('#4b5563');
    doc.text(`Subject: ${data.subject} | Instructor: ${data.instructorName}`);
    doc.text(`Student: ${data.studentName} (${data.studentEmail})`);
    doc.text(`Attempt: #${data.attemptNumber} | Submitted: ${new Date(data.submittedAt).toLocaleString()}`);

    doc.moveDown(1);

    // Score Summary Box
    const boxY = doc.y + 5;
    doc.rect(40, boxY, 515, 75).fillAndStroke('#f8fafc', '#cbd5e1');

    doc.fillColor('#1e3a8a').fontSize(11).font('Helvetica-Bold').text('EXAMINATION RESULTS SUMMARY', 55, boxY + 12);

    doc.fontSize(10).font('Helvetica').fillColor('#334155');
    doc.text(`Total Score: ${data.totalScore} / ${data.maxScore} (${data.percentage.toFixed(1)}%)`, 55, boxY + 32);
    doc.text(`Correct: ${data.correctCount}  |  Incorrect: ${data.incorrectCount}  |  Unanswered: ${data.unansweredCount}`, 55, boxY + 48);

    const timeMin = Math.floor(data.timeSpentSeconds / 60);
    const timeSec = data.timeSpentSeconds % 60;
    doc.text(`Time Spent: ${timeMin}m ${timeSec}s  |  Integrity Flags: ${data.integrityEventCount}`, 280, boxY + 48);

    // Pass / Fail Badge
    const badgeColor = data.isPassed ? '#16a34a' : '#dc2626';
    const badgeText = data.isPassed ? 'PASSED' : 'FAILED';
    doc.rect(450, boxY + 22, 90, 26).fill(badgeColor);
    doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold').text(badgeText, 465, boxY + 29);

    doc.y = boxY + 95;

    // Question Breakdown Table
    doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('Question-by-Question Breakdown', 40, doc.y);
    doc.moveDown(0.5);

    // Table Header
    let tableY = doc.y;
    doc.rect(40, tableY, 515, 20).fill('#e2e8f0');
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold');
    doc.text('#', 45, tableY + 6);
    doc.text('Question Statement', 65, tableY + 6);
    doc.text('Your Answer', 360, tableY + 6);
    doc.text('Correct', 430, tableY + 6);
    doc.text('Marks', 490, tableY + 6);

    tableY += 22;

    data.questions.forEach((q, idx) => {
      // Check page overflow
      if (tableY > 740) {
        doc.addPage();
        tableY = 40;
      }

      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, tableY, 515, 26).fill(rowBg);

      doc.fillColor('#334155').fontSize(8).font('Helvetica');
      doc.text(String(q.qNum), 45, tableY + 8);

      const truncatedQ = q.statement.length > 60 ? q.statement.slice(0, 58) + '...' : q.statement;
      doc.text(truncatedQ, 65, tableY + 8, { width: 285 });

      const ansColor = q.isCorrect ? '#16a34a' : q.studentAnswer ? '#dc2626' : '#64748b';
      doc.fillColor(ansColor).font('Helvetica-Bold').text(q.studentAnswer || '(None)', 360, tableY + 8);
      doc.fillColor('#16a34a').text(q.correctAnswer, 430, tableY + 8);

      doc.fillColor('#0f172a').font('Helvetica').text(`${q.marksAwarded} / ${q.maxMarks}`, 490, tableY + 8);

      tableY += 28;
    });

    // Footer
    const pageCount = doc.bufferedPageRange().count;
    doc.fontSize(8).fillColor('#94a3b8').text(
      `Generated by Q_Rice — Instructor-Led Quiz Management System | ${new Date().toISOString()}`,
      40,
      800,
      { align: 'center', width: 515 }
    );

    doc.end();
  });
}

export function generateClassReportPdf(data: ClassReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header banner
    doc.rect(40, 40, 515, 65).fill('#1e40af');
    doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold').text('Q_Rice', 55, 52);
    doc.fontSize(10).font('Helvetica').text('Class Assessment & Performance Analytics Report', 135, 62);
    doc.fontSize(8).fillColor('#bfdbfe').text('Smart Assessments. Secure Quizzes. Meaningful Results.', 55, 82);

    doc.moveDown(3);

    // Details
    doc.fillColor('#111827').fontSize(16).font('Helvetica-Bold').text(data.quizTitle, 40, 125);
    doc.fontSize(10).font('Helvetica').fillColor('#4b5563');
    doc.text(`Class: ${data.className} | Subject: ${data.subject}`);
    doc.text(`Instructor: ${data.instructorName} | Generated: ${new Date().toLocaleDateString()}`);

    doc.moveDown(1);

    // Class Analytics Summary
    const boxY = doc.y + 5;
    doc.rect(40, boxY, 515, 60).fillAndStroke('#eff6ff', '#bfdbfe');

    doc.fillColor('#1e40af').fontSize(10).font('Helvetica-Bold').text('CLASS PERFORMANCE METRICS', 55, boxY + 10);

    doc.fontSize(9).font('Helvetica').fillColor('#1e3a8a');
    doc.text(`Total Participants: ${data.totalParticipants}`, 55, boxY + 28);
    doc.text(`Completed Submissions: ${data.completedAttempts}`, 55, boxY + 42);

    doc.text(`Average Score: ${data.averageScore.toFixed(1)}`, 220, boxY + 28);
    doc.text(`Pass Percentage: ${data.passPercentage.toFixed(1)}%`, 220, boxY + 42);

    doc.text(`Highest Score: ${data.highestScore}`, 400, boxY + 28);
    doc.text(`Lowest Score: ${data.lowestScore}`, 400, boxY + 42);

    doc.y = boxY + 80;

    // Student Roster Table
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Student Results Summary', 40, doc.y);
    doc.moveDown(0.5);

    let tableY = doc.y;
    doc.rect(40, tableY, 515, 20).fill('#e2e8f0');
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold');
    doc.text('Rank', 45, tableY + 6);
    doc.text('Student Name', 80, tableY + 6);
    doc.text('Email', 230, tableY + 6);
    doc.text('Score', 380, tableY + 6);
    doc.text('%', 440, tableY + 6);
    doc.text('Status', 485, tableY + 6);

    tableY += 22;

    // Sort results by score desc
    const sorted = [...data.results].sort((a, b) => b.score - a.score);

    sorted.forEach((r, idx) => {
      if (tableY > 740) {
        doc.addPage();
        tableY = 40;
      }

      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(40, tableY, 515, 24).fill(rowBg);

      doc.fillColor('#334155').fontSize(8).font('Helvetica');
      doc.text(`#${idx + 1}`, 45, tableY + 7);
      doc.font('Helvetica-Bold').text(r.studentName, 80, tableY + 7);
      doc.font('Helvetica').fillColor('#64748b').text(r.email, 230, tableY + 7);

      doc.fillColor('#0f172a').text(`${r.score} / ${r.maxScore}`, 380, tableY + 7);
      doc.text(`${r.percentage.toFixed(1)}%`, 440, tableY + 7);

      const statusColor = r.isPassed ? '#16a34a' : '#dc2626';
      doc.fillColor(statusColor).font('Helvetica-Bold').text(r.isPassed ? 'PASS' : 'FAIL', 485, tableY + 7);

      tableY += 26;
    });

    doc.fontSize(8).fillColor('#94a3b8').text(
      `Generated by Q_Rice — Instructor-Led Quiz Management System | Confidential Institutional Record`,
      40,
      800,
      { align: 'center', width: 515 }
    );

    doc.end();
  });
}
