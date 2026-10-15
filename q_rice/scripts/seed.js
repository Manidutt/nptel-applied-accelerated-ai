// Q_Rice Development Seed Script
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Q_Rice database with production-grade demo data...');

  // Clean existing tables in correct order
  await prisma.auditLog.deleteMany();
  await prisma.integrityEvent.deleteMany();
  await prisma.studentResponse.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.sessionParticipant.deleteMany();
  await prisma.quizSession.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionBank.deleteMany();
  await prisma.classEnrollment.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@qrice.edu',
      passwordHash,
      name: 'Dr. Sarah Jenkins',
      role: 'ADMIN',
    },
  });

  const instructor = await prisma.user.create({
    data: {
      email: 'instructor@qrice.edu',
      passwordHash,
      name: 'Prof. Alan Vance',
      role: 'INSTRUCTOR',
    },
  });

  const student1 = await prisma.user.create({
    data: {
      email: 'alex.rivera@student.qrice.edu',
      passwordHash,
      name: 'Alex Rivera',
      role: 'STUDENT',
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'priya.sharma@student.qrice.edu',
      passwordHash,
      name: 'Priya Sharma',
      role: 'STUDENT',
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: 'marcus.chen@student.qrice.edu',
      passwordHash,
      name: 'Marcus Chen',
      role: 'STUDENT',
    },
  });

  console.log('✅ Users created (Admin, Instructor, 3 Students)');

  // 2. Create Class & Enrollments
  const courseClass = await prisma.class.create({
    data: {
      name: 'CS-401: Advanced Cloud & Distributed Systems',
      code: 'CS401-2026',
      description: 'Distributed computing, Kubernetes, high-concurrency architectures and GPU clustering.',
      instructorId: instructor.id,
    },
  });

  await prisma.classEnrollment.createMany({
    data: [
      { classId: courseClass.id, userId: student1.id },
      { classId: courseClass.id, userId: student2.id },
      { classId: courseClass.id, userId: student3.id },
    ],
  });

  console.log('✅ Class created with student enrollments');

  // 3. Create Question Bank
  const bank = await prisma.questionBank.create({
    data: {
      title: 'Cloud Architecture & Systems Question Bank',
      description: 'Standard collection of system design, distributed data, and high-performance computing questions.',
      subject: 'Computer Science',
      instructorId: instructor.id,
    },
  });

  // 4. Questions
  const q1 = await prisma.question.create({
    data: {
      instructorId: instructor.id,
      bankId: bank.id,
      statement: 'What is the primary architectural bottleneck described by the "Memory Wall" in high-performance computing?',
      type: 'single_choice',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'The Memory Wall refers to the expanding gap between CPU processing speeds and the latency/bandwidth of main DRAM memory access.',
      tags: 'Computer Architecture, Memory Systems',
      options: {
        create: [
          { optionKey: 'A', text: 'The high latency difference between DRAM and CPU registers', isCorrect: true },
          { optionKey: 'B', text: 'The lack of physical disk space on secondary NVMe drives', isCorrect: false },
          { optionKey: 'C', text: 'Silicon die area limitations during photolithography', isCorrect: false },
          { optionKey: 'D', text: 'Thermal throttling occurring exclusively at L1 cache', isCorrect: false },
        ],
      },
    },
  });

  const q2 = await prisma.question.create({
    data: {
      instructorId: instructor.id,
      bankId: bank.id,
      statement: 'Which of the following communication primitives are combined to construct a Ring All-Reduce operation in distributed deep learning?',
      type: 'multiple_choice',
      marks: 3.0,
      negativeMarks: 1.0,
      explanation: 'Ring All-Reduce executes in two phases: first Reduce-Scatter aggregates gradient chunks, followed by All-Gather broadcasting.',
      tags: 'Distributed Training, NCCL',
      options: {
        create: [
          { optionKey: 'A', text: 'Reduce-Scatter', isCorrect: true },
          { optionKey: 'B', text: 'Broadcast', isCorrect: false },
          { optionKey: 'C', text: 'All-Gather', isCorrect: true },
          { optionKey: 'D', text: 'Point-to-Point Barrier', isCorrect: false },
        ],
      },
    },
  });

  const q3 = await prisma.question.create({
    data: {
      instructorId: instructor.id,
      bankId: bank.id,
      statement: 'In PyTorch, in-place operations directly modify tensor memory and are safely supported during autograd backward pass calculation.',
      type: 'true_false',
      marks: 1.0,
      negativeMarks: 0.25,
      explanation: 'In-place modifications destroy original tensor values needed by the autograd engine to calculate gradients, throwing runtime errors.',
      tags: 'PyTorch, Autograd',
      options: {
        create: [
          { optionKey: 'A', text: 'True', isCorrect: false },
          { optionKey: 'B', text: 'False', isCorrect: true },
        ],
      },
    },
  });

  const q4 = await prisma.question.create({
    data: {
      instructorId: instructor.id,
      bankId: bank.id,
      statement: 'Which Kubernetes component on a worker node handles iptables or eBPF rules to route traffic to live Pod endpoints?',
      type: 'single_choice',
      marks: 2.0,
      negativeMarks: 0.5,
      explanation: 'kube-proxy runs on each worker node and programs kernel networking rules (iptables/IPVS/eBPF) for Service VIP routing.',
      tags: 'Kubernetes, Networking',
      options: {
        create: [
          { optionKey: 'A', text: 'kubelet', isCorrect: false },
          { optionKey: 'B', text: 'kube-proxy', isCorrect: true },
          { optionKey: 'C', text: 'containerd', isCorrect: false },
          { optionKey: 'D', text: 'etcd', isCorrect: false },
        ],
      },
    },
  });

  const q5 = await prisma.question.create({
    data: {
      instructorId: instructor.id,
      bankId: bank.id,
      statement: 'Which of the following techniques reduce memory consumption when fine-tuning large language models (LLMs)?',
      type: 'multiple_choice',
      marks: 3.0,
      negativeMarks: 1.0,
      explanation: 'Both LoRA (Parameter-Efficient Fine-Tuning) and Gradient Checkpointing substantially reduce VRAM requirements.',
      tags: 'LLMs, PEFT, Optimization',
      options: {
        create: [
          { optionKey: 'A', text: 'Low-Rank Adaptation (LoRA)', isCorrect: true },
          { optionKey: 'B', text: 'Activation Checkpointing (Gradient Checkpointing)', isCorrect: true },
          { optionKey: 'C', text: 'Using 32-bit Floating Point states for AdamW optimizer', isCorrect: false },
          { optionKey: 'D', text: 'Increasing batch size indefinitely', isCorrect: false },
        ],
      },
    },
  });

  const q6 = await prisma.question.create({
    data: {
      instructorId: instructor.id,
      bankId: bank.id,
      statement: 'SQLite is an embedded, in-process database engine that writes directly to disk files without a client-server daemon.',
      type: 'true_false',
      marks: 1.0,
      negativeMarks: 0.25,
      explanation: 'SQLite is serverless, zero-configuration, and integrated directly into the consuming application.',
      tags: 'Databases, Storage',
      options: {
        create: [
          { optionKey: 'A', text: 'True', isCorrect: true },
          { optionKey: 'B', text: 'False', isCorrect: false },
        ],
      },
    },
  });

  console.log('✅ 6 Questions seeded into Question Bank');

  // 5. Create Published Quiz
  const quiz = await prisma.quiz.create({
    data: {
      title: 'Midterm Assessment: Cloud Architecture & High-Performance Computing',
      description: 'Comprehensive assessment evaluating distributed training, container systems, and memory hierarchy.',
      instructions: 'Answer all 6 questions within the 30-minute time window. Browser tab switching and focus loss are monitored and logged.',
      subject: 'Computer Science',
      instructorId: instructor.id,
      classId: courseClass.id,
      status: 'PUBLISHED',
      accessCode: 'QRICE-401',
      durationMinutes: 30,
      totalMarks: 12.0,
      passingPercentage: 60.0,
      allowedAttempts: 2,
      negativeMarkingEnabled: true,
      partialCreditEnabled: true,
      integrityEnabled: true,
      requireFullscreen: true,
      tabSwitchThreshold: 3,
      autoSubmitOnViolation: false,
      flagForReview: true,
      releaseResultsImmediately: true,
    },
  });

  // Associate Questions to Quiz
  const questionsList = [q1, q2, q3, q4, q5, q6];
  for (let i = 0; i < questionsList.length; i++) {
    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        questionId: questionsList[i].id,
        orderIndex: i + 1,
        marks: questionsList[i].marks,
        negativeMarks: questionsList[i].negativeMarks,
      },
    });
  }

  console.log('✅ Quiz created and linked with 6 questions');

  // 6. Create Seed Completed Attempts for Analytics Demo
  // Attempt 1: Alex Rivera (High Scorer - 11/12)
  const attempt1 = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: student1.id,
      attemptNumber: 1,
      status: 'SUBMITTED',
      totalScore: 11.0,
      maxScore: 12.0,
      percentage: 91.67,
      isPassed: true,
      correctCount: 5,
      incorrectCount: 1,
      unansweredCount: 0,
      timeSpentSeconds: 840,
      integrityEventCount: 0,
      isFlaggedForReview: false,
      submittedAt: new Date(Date.now() - 3600000 * 2),
    },
  });

  // Attempt 2: Priya Sharma (Average Scorer - 8.5/12, with 1 tab switch)
  const attempt2 = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: student2.id,
      attemptNumber: 1,
      status: 'SUBMITTED',
      totalScore: 8.5,
      maxScore: 12.0,
      percentage: 70.83,
      isPassed: true,
      correctCount: 4,
      incorrectCount: 2,
      unansweredCount: 0,
      timeSpentSeconds: 1120,
      integrityEventCount: 1,
      isFlaggedForReview: false,
      submittedAt: new Date(Date.now() - 3600000 * 4),
    },
  });

  // Log integrity event for Priya
  await prisma.integrityEvent.create({
    data: {
      attemptId: attempt2.id,
      eventType: 'TAB_SWITCH',
      description: 'Student switched away from examination tab (Page Visibility hidden)',
      violationNo: 1,
      timestamp: new Date(Date.now() - 3600000 * 4 + 400000),
    },
  });

  // Attempt 3: Marcus Chen (Flagged Attempt - 5.0/12, with 3 tab switches)
  const attempt3 = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: student3.id,
      attemptNumber: 1,
      status: 'FLAGGED',
      totalScore: 5.0,
      maxScore: 12.0,
      percentage: 41.67,
      isPassed: false,
      correctCount: 3,
      incorrectCount: 2,
      unansweredCount: 1,
      timeSpentSeconds: 1450,
      integrityEventCount: 3,
      isFlaggedForReview: true,
      submittedAt: new Date(Date.now() - 3600000 * 6),
    },
  });

  // Log 3 integrity events for Marcus
  for (let v = 1; v <= 3; v++) {
    await prisma.integrityEvent.create({
      data: {
        attemptId: attempt3.id,
        eventType: v === 2 ? 'WINDOW_BLUR' : 'TAB_SWITCH',
        description: `Exam window focus lost (Violation #${v})`,
        violationNo: v,
        timestamp: new Date(Date.now() - 3600000 * 6 + v * 300000),
      },
    });
  }

  // 7. Seed Student Responses for Attempt 1
  await prisma.studentResponse.createMany({
    data: [
      { attemptId: attempt1.id, questionId: q1.id, selectedKeys: 'A', isCorrect: true, marksAwarded: 2.0 },
      { attemptId: attempt1.id, questionId: q2.id, selectedKeys: 'A|C', isCorrect: true, marksAwarded: 3.0 },
      { attemptId: attempt1.id, questionId: q3.id, selectedKeys: 'B', isCorrect: true, marksAwarded: 1.0 },
      { attemptId: attempt1.id, questionId: q4.id, selectedKeys: 'B', isCorrect: true, marksAwarded: 2.0 },
      { attemptId: attempt1.id, questionId: q5.id, selectedKeys: 'A|B', isCorrect: true, marksAwarded: 3.0 },
      { attemptId: attempt1.id, questionId: q6.id, selectedKeys: 'B', isCorrect: false, marksAwarded: 0.0 },
    ],
  });

  // 8. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { userId: instructor.id, action: 'QUIZ_CREATED', resourceType: 'Quiz', resourceId: quiz.id, details: JSON.stringify({ title: quiz.title }) },
      { userId: instructor.id, action: 'QUIZ_PUBLISHED', resourceType: 'Quiz', resourceId: quiz.id, details: JSON.stringify({ accessCode: quiz.accessCode }) },
      { userId: student1.id, action: 'ATTEMPT_SUBMITTED', resourceType: 'QuizAttempt', resourceId: attempt1.id, details: JSON.stringify({ score: 11.0 }) },
      { userId: student3.id, action: 'ATTEMPT_FLAGGED', resourceType: 'QuizAttempt', resourceId: attempt3.id, details: JSON.stringify({ violations: 3 }) },
    ],
  });

  console.log('✅ Audit logs and student attempts seeded successfully!');
  console.log('\n--- Q_Rice Demo Credentials ---');
  console.log('Administrator: admin@qrice.edu      | Password: Password123!');
  console.log('Instructor:    instructor@qrice.edu | Password: Password123!');
  console.log('Student 1:     alex.rivera@student.qrice.edu  | Password: Password123!');
  console.log('Student 2:     priya.sharma@student.qrice.edu | Password: Password123!');
  console.log('Student 3:     marcus.chen@student.qrice.edu  | Password: Password123!');
  console.log('-------------------------------\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
