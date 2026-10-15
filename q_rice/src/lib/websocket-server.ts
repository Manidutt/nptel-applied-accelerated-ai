import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage, Server } from 'http';

export interface ParticipantInfo {
  userId: string;
  name: string;
  role: 'INSTRUCTOR' | 'STUDENT';
  socket: WebSocket;
  joinedAt: Date;
}

export interface LiveSessionState {
  sessionId: string;
  sessionCode: string;
  quizId: string;
  instructorId: string;
  status: 'WAITING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  mode: 'INSTRUCTOR_LED' | 'SELF_PACED';
  currentQuestionIndex: number;
  totalQuestions: number;
  participants: Map<string, ParticipantInfo>; // userId -> ParticipantInfo
  answeredStudents: Map<number, Set<string>>; // questionIndex -> Set of userIds who answered
}

// Global in-memory registry of active live sessions
const activeSessions = new Map<string, LiveSessionState>(); // sessionCode -> LiveSessionState

export function getLiveSession(sessionCode: string): LiveSessionState | undefined {
  return activeSessions.get(sessionCode.toUpperCase());
}

export function registerLiveSession(
  sessionId: string,
  sessionCode: string,
  quizId: string,
  instructorId: string,
  totalQuestions: number,
  mode: 'INSTRUCTOR_LED' | 'SELF_PACED' = 'INSTRUCTOR_LED'
): LiveSessionState {
  const code = sessionCode.toUpperCase();
  let session = activeSessions.get(code);
  if (!session) {
    session = {
      sessionId,
      sessionCode: code,
      quizId,
      instructorId,
      status: 'WAITING',
      mode,
      currentQuestionIndex: 0,
      totalQuestions,
      participants: new Map(),
      answeredStudents: new Map(),
    };
    activeSessions.set(code, session);
  }
  return session;
}

export function broadcastToSession(session: LiveSessionState, message: object) {
  const payload = JSON.stringify(message);
  for (const p of session.participants.values()) {
    if (p.socket.readyState === WebSocket.OPEN) {
      p.socket.send(payload);
    }
  }
}

export function initWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/api/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    let currentSessionCode: string | null = null;
    let currentUserId: string | null = null;

    ws.on('message', (rawData: string) => {
      try {
        const msg = JSON.parse(rawData.toString());
        const { type, sessionCode, userId, name, role } = msg;

        if (type === 'JOIN_SESSION') {
          const code = (sessionCode || '').toUpperCase();
          const session = activeSessions.get(code);

          if (!session) {
            ws.send(JSON.stringify({ type: 'ERROR', message: `Session code ${code} not found.` }));
            return;
          }

          currentSessionCode = code;
          currentUserId = userId;

          session.participants.set(userId, {
            userId,
            name: name || 'Student',
            role: role || 'STUDENT',
            socket: ws,
            joinedAt: new Date(),
          });

          // Send current state to joined user
          const answerCountForCurrentQ =
            session.answeredStudents.get(session.currentQuestionIndex)?.size || 0;

          ws.send(
            JSON.stringify({
              type: 'SESSION_STATE',
              status: session.status,
              currentQuestionIndex: session.currentQuestionIndex,
              totalQuestions: session.totalQuestions,
              mode: session.mode,
              participantsCount: session.participants.size,
              answeredCount: answerCountForCurrentQ,
            })
          );

          // Broadcast roster update to instructor and all members
          const roster = Array.from(session.participants.values()).map((p) => ({
            userId: p.userId,
            name: p.name,
            role: p.role,
          }));

          broadcastToSession(session, {
            type: 'ROSTER_UPDATE',
            participantsCount: session.participants.size,
            roster,
          });
        } else if (type === 'START_SESSION') {
          // Instructor Only
          if (currentSessionCode) {
            const session = activeSessions.get(currentSessionCode);
            if (session && session.instructorId === userId) {
              session.status = 'ACTIVE';
              session.currentQuestionIndex = 0;
              broadcastToSession(session, {
                type: 'SESSION_STATE',
                status: 'ACTIVE',
                currentQuestionIndex: 0,
                totalQuestions: session.totalQuestions,
                mode: session.mode,
              });
            }
          }
        } else if (type === 'PAUSE_SESSION') {
          if (currentSessionCode) {
            const session = activeSessions.get(currentSessionCode);
            if (session && session.instructorId === userId) {
              session.status = 'PAUSED';
              broadcastToSession(session, {
                type: 'SESSION_STATE',
                status: 'PAUSED',
                currentQuestionIndex: session.currentQuestionIndex,
              });
            }
          }
        } else if (type === 'RESUME_SESSION') {
          if (currentSessionCode) {
            const session = activeSessions.get(currentSessionCode);
            if (session && session.instructorId === userId) {
              session.status = 'ACTIVE';
              broadcastToSession(session, {
                type: 'SESSION_STATE',
                status: 'ACTIVE',
                currentQuestionIndex: session.currentQuestionIndex,
              });
            }
          }
        } else if (type === 'NEXT_QUESTION') {
          if (currentSessionCode) {
            const session = activeSessions.get(currentSessionCode);
            if (session && session.instructorId === userId) {
              if (session.currentQuestionIndex < session.totalQuestions - 1) {
                session.currentQuestionIndex++;
                const answered =
                  session.answeredStudents.get(session.currentQuestionIndex)?.size || 0;
                broadcastToSession(session, {
                  type: 'QUESTION_CHANGED',
                  currentQuestionIndex: session.currentQuestionIndex,
                  answeredCount: answered,
                });
              }
            }
          }
        } else if (type === 'PREV_QUESTION') {
          if (currentSessionCode) {
            const session = activeSessions.get(currentSessionCode);
            if (session && session.instructorId === userId) {
              if (session.currentQuestionIndex > 0) {
                session.currentQuestionIndex--;
                const answered =
                  session.answeredStudents.get(session.currentQuestionIndex)?.size || 0;
                broadcastToSession(session, {
                  type: 'QUESTION_CHANGED',
                  currentQuestionIndex: session.currentQuestionIndex,
                  answeredCount: answered,
                });
              }
            }
          }
        } else if (type === 'SUBMIT_ANSWER_SIGNAL') {
          if (currentSessionCode && currentUserId) {
            const session = activeSessions.get(currentSessionCode);
            if (session) {
              const qIdx = msg.questionIndex ?? session.currentQuestionIndex;
              if (!session.answeredStudents.has(qIdx)) {
                session.answeredStudents.set(qIdx, new Set());
              }
              session.answeredStudents.get(qIdx)!.add(currentUserId);

              broadcastToSession(session, {
                type: 'ANSWER_COUNT_UPDATE',
                questionIndex: qIdx,
                answeredCount: session.answeredStudents.get(qIdx)!.size,
                totalParticipants: session.participants.size,
              });
            }
          }
        } else if (type === 'INTEGRITY_VIOLATION_SIGNAL') {
          if (currentSessionCode && currentUserId) {
            const session = activeSessions.get(currentSessionCode);
            if (session) {
              // Notify instructor of real-time tab switch or blur event
              broadcastToSession(session, {
                type: 'INTEGRITY_ALERT',
                userId: currentUserId,
                studentName: msg.studentName || 'Student',
                eventType: msg.eventType || 'TAB_SWITCH',
                violationNo: msg.violationNo || 1,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } else if (type === 'END_SESSION') {
          if (currentSessionCode) {
            const session = activeSessions.get(currentSessionCode);
            if (session && session.instructorId === userId) {
              session.status = 'COMPLETED';
              broadcastToSession(session, {
                type: 'SESSION_STATE',
                status: 'COMPLETED',
                message: 'The instructor has concluded the examination session.',
              });
            }
          }
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (currentSessionCode && currentUserId) {
        const session = activeSessions.get(currentSessionCode);
        if (session) {
          session.participants.delete(currentUserId);
          const roster = Array.from(session.participants.values()).map((p) => ({
            userId: p.userId,
            name: p.name,
            role: p.role,
          }));
          broadcastToSession(session, {
            type: 'ROSTER_UPDATE',
            participantsCount: session.participants.size,
            roster,
          });
        }
      }
    });
  });

  console.log('⚡ WebSocket server attached to /api/ws');
  return wss;
}
