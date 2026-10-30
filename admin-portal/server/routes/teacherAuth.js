const express = require('express');

const router = express.Router();

// Teachers are Classroom AI's accounts, not this portal's. The sign-in page
// could call it directly, but the browser would then need Classroom AI to
// allow this origin; forwarding the two calls here keeps that app untouched
// and means only one host ever has to be reachable from the browser.
const CLASSROOM_AI = process.env.CLASSROOM_AI_URL || 'http://localhost:8001';

async function forward(path, body, res) {
  let upstream;
  try {
    upstream = await fetch(`${CLASSROOM_AI}/api/auth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {}),
    });
  } catch (err) {
    console.error(`Classroom AI unreachable at ${CLASSROOM_AI}:`, err.message);
    return res.status(502).json({ error: 'Could not reach Classroom AI. Is it running?' });
  }

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    // FastAPI reports the reason under "detail".
    return res.status(upstream.status).json({ error: data.detail || data.error || 'Sign-in failed' });
  }
  return res.json(data);
}

router.post('/login', (req, res) => forward('login', req.body, res));

router.post('/register', (req, res) => forward('register', req.body, res));

module.exports = router;
