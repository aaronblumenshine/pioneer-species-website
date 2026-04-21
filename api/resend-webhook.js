export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, data } = req.body || {};
  const emailId = data?.email_id ?? data?.id ?? null;
  const timestamp = data?.created_at ?? new Date().toISOString();

  console.log(JSON.stringify({ event_type: type, email_id: emailId, timestamp }));

  return res.status(200).json({ received: true });
}
