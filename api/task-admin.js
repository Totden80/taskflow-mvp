const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const reply = (body, status = 200) => ({ status, headers: { ...cors, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  if (req.method !== 'POST') return res.writeHead(405, cors).end(JSON.stringify({ error: 'Method not allowed' }));
  const base = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !serviceKey) return res.writeHead(500, cors).end(JSON.stringify({ error: 'Thiáº¿u cáº¥u hÃ¬nh Supabase trÃªn Vercel.' }));
  const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.writeHead(401, cors).end(JSON.stringify({ error: 'Báº¡n chÆ°a Ä‘Äƒng nháº­p.' }));
    const authRes = await fetch(`${base}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
    const authUser = await authRes.json();
    if (!authRes.ok || !authUser.id) return res.writeHead(401, cors).end(JSON.stringify({ error: 'PhiÃªn Ä‘Äƒng nháº­p khÃ´ng há»£p lá»‡.' }));
    const actorRes = await fetch(`${base}/rest/v1/profiles?id=eq.${authUser.id}&select=id,role_level,status`, { headers });
    const actors = await actorRes.json();
    const actor = actors[0];
    if (!actor || actor.status !== 'active' || actor.role_level !== 0) return res.writeHead(403, cors).end(JSON.stringify({ error: 'Chá»‰ Admin Ä‘Æ°á»£c quáº£n lÃ½ tÃ i khoáº£n vÃ  nhÃ³m.' }));
    const body = req.body || {};
    const action = body.action;
    if (action === 'list') {
      const [usersRes, groupsRes] = await Promise.all([
        fetch(`${base}/rest/v1/profiles?select=*&order=role_level,full_name`, { headers }),
        fetch(`${base}/rest/v1/task_groups?status=eq.active&select=*&order=name`, { headers })
      ]);
      return res.writeHead(200, cors).end(JSON.stringify({ users: await usersRes.json(), groups: await groupsRes.json() }));
    }
    if (action === 'create_user') {
      const { email, password, username, full_name, role_level, manager_id } = body;
      if (!email || !password || !username || !full_name) return res.writeHead(400, cors).end(JSON.stringify({ error: 'Vui lÃ²ng nháº­p Ä‘á»§ thÃ´ng tin tÃ i khoáº£n.' }));
      const createdRes = await fetch(`${base}/auth/v1/admin/users`, { method: 'POST', headers, body: JSON.stringify({ email, password, email_confirm: true }) });
      const created = await createdRes.json();
      if (!createdRes.ok || !created.id) return res.writeHead(createdRes.status, cors).end(JSON.stringify({ error: created.msg || created.message || 'KhÃ´ng táº¡o Ä‘Æ°á»£c tÃ i khoáº£n Auth.' }));
      const profileRes = await fetch(`${base}/rest/v1/profiles?id=eq.${created.id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ email, username, full_name, role_level: Number(role_level || 3), manager_id: manager_id || null, status: 'active' }) });
      if (!profileRes.ok) { await fetch(`${base}/auth/v1/admin/users/${created.id}`, { method: 'DELETE', headers }); return res.writeHead(400, cors).end(JSON.stringify({ error: await profileRes.text() })); }
      return res.writeHead(200, cors).end(JSON.stringify({ ok: true, id: created.id }));
    }
    if (action === 'update_user') {
      const { id, email, password, username, full_name, role_level, manager_id, status } = body;
      if (!id || id === actor.id) return res.writeHead(400, cors).end(JSON.stringify({ error: 'KhÃ´ng thá»ƒ tá»± khÃ³a hoáº·c sá»­a tÃ i khoáº£n Admin hiá»‡n táº¡i.' }));
      const profileRes = await fetch(`${base}/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ email, username, full_name, role_level: Number(role_level), manager_id: manager_id || null, status }) });
      if (!profileRes.ok) return res.writeHead(400, cors).end(JSON.stringify({ error: await profileRes.text() }));
      if (email || password) { const authRes2 = await fetch(`${base}/auth/v1/admin/users/${id}`, { method: 'PUT', headers, body: JSON.stringify({ ...(email ? { email } : {}), ...(password ? { password } : {}) }) }); if (!authRes2.ok) return res.writeHead(400, cors).end(JSON.stringify({ error: await authRes2.text() })); }
      return res.writeHead(200, cors).end(JSON.stringify({ ok: true }));
    }
    if (action === 'delete_user') {
      if (!body.id || body.id === actor.id) return res.writeHead(400, cors).end(JSON.stringify({ error: 'KhÃ´ng thá»ƒ xÃ³a tÃ i khoáº£n hiá»‡n táº¡i.' }));
      const delRes = await fetch(`${base}/auth/v1/admin/users/${body.id}`, { method: 'DELETE', headers });
      return res.writeHead(delRes.ok ? 200 : delRes.status, cors).end(JSON.stringify(delRes.ok ? { ok: true } : { error: await delRes.text() }));
    }
    if (action === 'create_group') { const r = await fetch(`${base}/rest/v1/task_groups`, { method: 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ name: body.name, description: body.description || '', created_by: actor.id }) }); return res.writeHead(r.ok ? 200 : r.status, cors).end(JSON.stringify({ group: (await r.json())[0] })); }
    if (action === 'update_group') { const r = await fetch(`${base}/rest/v1/task_groups?id=eq.${body.id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify({ name: body.name, description: body.description || '' }) }); return res.writeHead(r.ok ? 200 : r.status, cors).end(JSON.stringify({ group: (await r.json())[0] })); }
    if (action === 'delete_group') { const r = await fetch(`${base}/rest/v1/task_groups?id=eq.${body.id}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'archived' }) }); return res.writeHead(r.ok ? 200 : r.status, cors).end(JSON.stringify({ ok: r.ok })); }
    return res.writeHead(400, cors).end(JSON.stringify({ error: 'Action khÃ´ng Ä‘Æ°á»£c há»— trá»£.' }));
  } catch (error) { return res.writeHead(500, cors).end(JSON.stringify({ error: error.message || 'Lá»—i mÃ¡y chá»§.' })); }
}

