import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, requireRole, UserSessionPayload } from '../lib/auth';

describe('Authentication & Role-Based Access Control (RBAC)', () => {
  const adminUser: UserSessionPayload = {
    userId: 'user-admin-1',
    email: 'admin@qrice.edu',
    name: 'Administrator',
    role: 'ADMIN',
  };

  const instructorUser: UserSessionPayload = {
    userId: 'user-instructor-1',
    email: 'instructor@qrice.edu',
    name: 'Dr. Jane Smith',
    role: 'INSTRUCTOR',
  };

  const studentUser: UserSessionPayload = {
    userId: 'user-student-1',
    email: 'alex@student.qrice.edu',
    name: 'Alex Rivera',
    role: 'STUDENT',
  };

  it('signs and verifies valid JWT session tokens', () => {
    const token = signToken(instructorUser);
    expect(typeof token).toBe('string');

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(instructorUser.userId);
    expect(decoded?.email).toBe(instructorUser.email);
    expect(decoded?.role).toBe('INSTRUCTOR');
  });

  it('rejects tampered or forged tokens', () => {
    const token = signToken(studentUser);
    const tampered = token.slice(0, -6) + 'abcdef';
    const decoded = verifyToken(tampered);
    expect(decoded).toBeNull();
  });

  it('enforces RBAC: allows only instructors or admins for quiz creation endpoints', () => {
    const allowedRoles = ['INSTRUCTOR', 'ADMIN'];

    expect(requireRole(adminUser, allowedRoles)).toBe(true);
    expect(requireRole(instructorUser, allowedRoles)).toBe(true);
    expect(requireRole(studentUser, allowedRoles)).toBe(false);
    expect(requireRole(null, allowedRoles)).toBe(false);
  });

  it('enforces RBAC: restricts admin console strictly to ADMIN', () => {
    const adminOnly = ['ADMIN'];

    expect(requireRole(adminUser, adminOnly)).toBe(true);
    expect(requireRole(instructorUser, adminOnly)).toBe(false);
    expect(requireRole(studentUser, adminOnly)).toBe(false);
  });

  it('preserves student isolation against role elevation', () => {
    const studentToken = signToken(studentUser);
    const decoded = verifyToken(studentToken);

    // Verify student cannot pass an instructor-only gate
    const canManageQuizzes = requireRole(decoded, ['INSTRUCTOR', 'ADMIN']);
    expect(canManageQuizzes).toBe(false);

    // Verify student can only pass student gates
    const canAttemptExam = requireRole(decoded, ['STUDENT']);
    expect(canAttemptExam).toBe(true);
  });
});
