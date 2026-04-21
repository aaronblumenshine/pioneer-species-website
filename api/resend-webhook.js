export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, data } = req.body || {};
  const emailId = data?.email_id ?? data?.id ?? '(unknown)';
  const to = data?.to?.[0] ?? data?.email_address ?? '(unknown)';
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
