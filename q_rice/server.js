const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3002', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory active live sessions for WebSocket orchestration
const activeSessions = new Map(); // sessionCode -> sessionState

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Attach WebSocket server on /api/ws
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url);
    if (pathname === '/api/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  function broadcast(session, message) {
    const payload = JSON.stringify(message);
    if (!session || !session.participants) return;
    for (const p of session.participants.values()) {
      if (p.socket && p.socket.readyState === WebSocket.OPEN) {
        p.socket.send(payload);
      }
    }
  }

  wss.on('connection', (ws) => {
    let currentSessionCode = null;
    let currentUserId = null;

    ws.on('message', (rawData) => {
      try {
        const msg = JSON.parse(rawData.toString());
        const { type, sessionCode, userId, name, role } = msg;

        if (type === 'REGISTER_SESSION') {
          // Instructor registers a live session
          const code = (sessionCode || '').toUpperCase();
          if (!activeSessions.has(code)) {
            activeSessions.set(code, {
              sessionId: msg.sessionId,
              sessionCode: code,
              quizId: msg.quizId,
              instructorId: userId,
              status: 'WAITING',
              mode: msg.mode || 'INSTRUCTOR_LED',
              currentQuestionIndex: 0,
              totalQuestions: msg.totalQuestions || 0,
              participants: new Map(),
              answeredStudents: new Map(),
            });
          }
          currentSessionCode = code;
          currentUserId = userId;
          const session = activeSessions.get(code);
          session.participants.set(userId, { userId, name, role: 'INSTRUCTOR', socket: ws });
          ws.send(JSON.stringify({ type: 'REGISTERED', status: session.status, sessionCode: code }));
        } else if (type === 'JOIN_SESSION') {
          const code = (sessionCode || '').toUpperCase();
          let session = activeSessions.get(code);

          // If session not yet registered in memory, create a waiting container
          if (!session) {
            session = {
              sessionId: msg.sessionId || 'live-session',
              sessionCode: code,
              quizId: msg.quizId,
              instructorId: null,
              status: 'WAITING',
              mode: 'INSTRUCTOR_LED',
              currentQuestionIndex: 0,
              totalQuestions: msg.totalQuestions || 0,
              participants: new Map(),
              answeredStudents: new Map(),
            };
            activeSessions.set(code, session);
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
          const answered = session.answeredStudents.get(session.currentQuestionIndex)?.size || 0;
          ws.send(
            JSON.stringify({
              type: 'SESSION_STATE',
              status: session.status,
              currentQuestionIndex: session.currentQuestionIndex,
              totalQuestions: session.totalQuestions,
              mode: session.mode,
              participantsCount: session.participants.size,
              answeredCount: answered,
            })
          );

          // Broadcast roster update
          const roster = Array.from(session.participants.values()).map((p) => ({
            userId: p.userId,
            name: p.name,
            role: p.role,
          }));

          broadcast(session, {
            type: 'ROSTER_UPDATE',
            participantsCount: session.participants.size,
            roster,
          });
        } else if (type === 'START_SESSION') {
          if (currentSessionCode && activeSessions.has(currentSessionCode)) {
            const session = activeSessions.get(currentSessionCode);
            session.status = 'ACTIVE';
            session.currentQuestionIndex = 0;
            broadcast(session, {
              type: 'SESSION_STATE',
              status: 'ACTIVE',
              currentQuestionIndex: 0,
              totalQuestions: session.totalQuestions,
            });
          }
        } else if (type === 'PAUSE_SESSION') {
          if (currentSessionCode && activeSessions.has(currentSessionCode)) {
            const session = activeSessions.get(currentSessionCode);
            session.status = 'PAUSED';
            broadcast(session, {
              type: 'SESSION_STATE',
              status: 'PAUSED',
              currentQuestionIndex: session.currentQuestionIndex,
            });
          }
        } else if (type === 'RESUME_SESSION') {
          if (currentSessionCode && activeSessions.has(currentSessionCode)) {
            const session = activeSessions.get(currentSessionCode);
            session.status = 'ACTIVE';
            broadcast(session, {
              type: 'SESSION_STATE',
              status: 'ACTIVE',
              currentQuestionIndex: session.currentQuestionIndex,
            });
          }
        } else if (type === 'NEXT_QUESTION') {
          if (currentSessionCode && activeSessions.has(currentSessionCode)) {
            const session = activeSessions.get(currentSessionCode);
            if (session.currentQuestionIndex < session.totalQuestions - 1) {
              session.currentQuestionIndex++;
              const answered = session.answeredStudents.get(session.currentQuestionIndex)?.size || 0;
              broadcast(session, {
                type: 'QUESTION_CHANGED',
                currentQuestionIndex: session.currentQuestionIndex,
                answeredCount: answered,
              });
            }
          }
        } else if (type === 'PREV_QUESTION') {
          if (currentSessionCode && activeSessions.has(currentSessionCode)) {
            const session = activeSessions.get(currentSessionCode);
            if (session.currentQuestionIndex > 0) {
              session.currentQuestionIndex--;
              const answered = session.answeredStudents.get(session.currentQuestionIndex)?.size || 0;
              broadcast(session, {
                type: 'QUESTION_CHANGED',
                currentQuestionIndex: session.currentQuestionIndex,
                answeredCount: answered,
              });
            }
          }
        } else if (type === 'SUBMIT_ANSWER_SIGNAL') {
          if (currentSessionCode && activeSessions.has(currentSessionCode)) {
            const session = activeSessions.get(currentSessionCode);
            const qIdx = msg.questionIndex ?? session.currentQuestionIndex;
            if (!session.answeredStudents.has(qIdx)) {
              session.answeredStudents.set(qIdx, new Set());
            }
            session.answeredStudents.get(qIdx).add(currentUserId);

            broadcast(session, {
              type: 'ANSWER_COUNT_UPDATE',
              questionIndex: qIdx,
              answeredCount: session.answeredStudents.get(qIdx).size,
              totalParticipants: session.participants.size,
            });
          }
        } else if (type === 'INTEGRITY_ALERT') {
          if (currentSessionCode && activeSessions.has(currentSessionCode)) {
            const session = activeSessions.get(currentSessionCode);
            broadcast(session, {
              type: 'INTEGRITY_ALERT',
              userId: currentUserId,
              studentName: msg.studentName || 'Student',
              eventType: msg.eventType || 'TAB_SWITCH',
              violationNo: msg.violationNo || 1,
              timestamp: new Date().toISOString(),
            });
          }
        } else if (type === 'KICK_PARTICIPANT') {
          if (currentSessionCode && activeSessions.has(currentSessionCode)) {
            const session = activeSessions.get(currentSessionCode);
            const targetUserId = msg.targetUserId;
            if (targetUserId && session.participants.has(targetUserId)) {
              const target = session.participants.get(targetUserId);
              if (target.socket && target.socket.readyState === WebSocket.OPEN) {
                target.socket.send(
                  JSON.stringify({
                    type: 'KICKED',
                    reason: msg.reason || 'You were removed from this session by the instructor.',
                  })
                );
                target.socket.close();
              }
              session.participants.delete(targetUserId);

              const roster = Array.from(session.participants.values()).map((p) => ({
                userId: p.userId,
                name: p.name,
                role: p.role,
              }));

              broadcast(session, {
                type: 'ROSTER_UPDATE',
                participantsCount: session.participants.size,
                roster,
              });
            }
          }
        } else if (type === 'REVEAL_ANSWER') {
          if (currentSessionCode && activeSessions.has(currentSessionCode)) {
            const session = activeSessions.get(currentSessionCode);
            broadcast(session, {
              type: 'ANSWER_REVEALED',
              questionIndex: session.currentQuestionIndex,
              reveal: Boolean(msg.reveal),
            });
          }
        } else if (type === 'END_SESSION') {
          if (currentSessionCode && activeSessions.has(currentSessionCode)) {
            const session = activeSessions.get(currentSessionCode);
            session.status = 'COMPLETED';
            broadcast(session, {
              type: 'SESSION_STATE',
              status: 'COMPLETED',
              message: 'The examination session has been concluded by the instructor.',
            });
          }
        }
      } catch (e) {
        console.error('WS Error:', e);
      }
    });

    ws.on('close', () => {
      if (currentSessionCode && currentUserId && activeSessions.has(currentSessionCode)) {
        const session = activeSessions.get(currentSessionCode);
        session.participants.delete(currentUserId);
        const roster = Array.from(session.participants.values()).map((p) => ({
          userId: p.userId,
          name: p.name,
          role: p.role,
        }));
        broadcast(session, {
          type: 'ROSTER_UPDATE',
          participantsCount: session.participants.size,
          roster,
        });
      }
    });
  });

  server.listen(port, () => {
    console.log(`\n======================================================`);
    console.log(`🌾 Q_Rice — Instructor-Led Quiz Management System`);
    console.log(`Tagline: Smart Assessments. Secure Quizzes. Meaningful Results.`);
    console.log(`🌐 Application URL: http://${hostname}:${port}`);
    console.log(`⚡ Real-time WebSockets: ws://${hostname}:${port}/api/ws`);
    console.log(`======================================================\n`);
  });
});
