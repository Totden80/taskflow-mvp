import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Báº¡n chÆ°a Ä‘Äƒng nháº­p.' }, 401);
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: 'PhiÃªn Ä‘Äƒng nháº­p khÃ´ng há»£p lá»‡.' }, 401);
    const { data: actor } = await admin.from('profiles').select('id,role_level,status').eq('id', authData.user.id).single();
    if (!actor || actor.status !== 'active' || actor.role_level !== 0) return json({ error: 'Chá»‰ Admin Ä‘Æ°á»£c quáº£n lÃ½ tÃ i khoáº£n vÃ  nhÃ³m.' }, 403);
    const body = await req.json();
    const action = body.action;

    if (action === 'list') {
      const [{ data: users, error: usersError }, { data: groups, error: groupsError }] = await Promise.all([
        admin.from('profiles').select('*').order('role_level').order('full_name'),
        admin.from('task_groups').select('*').eq('status', 'active').order('name')
      ]);
      if (usersError || groupsError) throw usersError || groupsError;
      return json({ users, groups });
    }
    if (action === 'create_user') {
      const { email, password, username, full_name, role_level, manager_id } = body;
      if (!email || !password || !username || !full_name) return json({ error: 'Vui lÃ²ng nháº­p Ä‘á»§ email, máº­t kháº©u, tÃªn Ä‘Äƒng nháº­p vÃ  há» tÃªn.' }, 400);
      const { data: created, error: createError } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (createError || !created.user) throw createError || new Error('KhÃ´ng táº¡o Ä‘Æ°á»£c tÃ i khoáº£n Auth');
      const { error: profileError } = await admin.from('profiles').update({ username, full_name, role_level: Number(role_level || 3), manager_id: manager_id || null, status: 'active' }).eq('id', created.user.id);
      if (profileError) { await admin.auth.admin.deleteUser(created.user.id); throw profileError; }
      return json({ ok: true, id: created.user.id });
    }
    if (action === 'update_user') {
      const { id, email, password, username, full_name, role_level, manager_id, status } = body;
      if (id === actor.id) return json({ error: 'KhÃ´ng Ä‘Æ°á»£c tá»± thay Ä‘á»•i hoáº·c khÃ³a tÃ i khoáº£n Admin Ä‘ang Ä‘Äƒng nháº­p.' }, 400);
      const { error: profileError } = await admin.from('profiles').update({ email, username, full_name, role_level: Number(role_level), manager_id: manager_id || null, status }).eq('id', id);
      if (profileError) throw profileError;
      if (email || password) { const { error } = await admin.auth.admin.updateUserById(id, { ...(email ? { email } : {}), ...(password ? { password } : {}) }); if (error) throw error; }
      return json({ ok: true });
    }
    if (action === 'delete_user') {
      if (!body.id || body.id === actor.id) return json({ error: 'KhÃ´ng thá»ƒ xÃ³a tÃ i khoáº£n hiá»‡n táº¡i.' }, 400);
      const { error } = await admin.auth.admin.deleteUser(body.id);
      if (error) throw error;
      return json({ ok: true });
    }
    if (action === 'create_group') {
      const { data, error } = await admin.from('task_groups').insert({ name: body.name, description: body.description || '', created_by: actor.id }).select().single();
      if (error) throw error;
      return json({ group: data });
    }
    if (action === 'update_group') {
      const { data, error } = await admin.from('task_groups').update({ name: body.name, description: body.description || '' }).eq('id', body.id).select().single();
      if (error) throw error;
      return json({ group: data });
    }
    if (action === 'delete_group') {
      const { error } = await admin.from('task_groups').update({ status: 'archived' }).eq('id', body.id);
      if (error) throw error;
      return json({ ok: true });
    }
    return json({ error: 'Action khÃ´ng Ä‘Æ°á»£c há»— trá»£.' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Lá»—i mÃ¡y chá»§.' }, 500);
  }
});

