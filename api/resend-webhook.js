import crypto from 'crypto';

export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifySignature(rawBody, headers, secret) {
  const msgId        = headers['svix-id'];
  const msgTimestamp = headers['svix-timestamp'];
  const msgSig       = headers['svix-signature'];

  if (!msgId || !msgTimestamp || !msgSig) return false;

  // Reject payloads older than 5 minutes
  const ts = parseInt(msgTimestamp, 10);
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const toSign = `${msgId}.${msgTimestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', key).update(toSign).digest('base64');

  return msgSig.split(' ').some(s => {
    const [, sig] = s.split(',');
    return sig === expected;
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await getRawBody(req);
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[webhook] RESEND_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  if (!verifySignature(rawBody, req.headers, secret)) {
    console.warn('[webhook] Signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, data } = JSON.parse(rawBody.toString('utf8'));
  const emailId   = data?.email_id ?? data?.id ?? '(unknown)';
  const to        = data?.to?.[0] ?? data?.email_address ?? '(unknown)';
  const timestamp = data?.created_at ?? new Date().toISOString();

  switch (type) {
    case 'email.delivered':
      console.log(`[delivered] id=${emailId} to=${to} at=${timestamp}`);
      break;
    case 'email.opened':
      console.log(`[opened]    id=${emailId} to=${to} at=${timestamp}`);
      break;
    case 'email.clicked':
      console.log(`[clicked]   id=${emailId} to=${to} url=${data?.click?.link ?? '(unknown)'} at=${timestamp}`);
      break;
    case 'email.bounced':
      console.log(`[bounced]   id=${emailId} to=${to} reason=${data?.bounce?.message ?? '(unknown)'} at=${timestamp}`);
      break;
    default:
      console.log(`[unknown]   type=${type} id=${emailId} at=${timestamp}`);
  }

  return res.status(200).json({ received: true });
}
