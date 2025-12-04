
import { createClient } from '@supabase/supabase-js';

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  try {
    const { password } = await request.json();
    const authHeader = request.headers.get('Authorization');

    if (!password) {
      return new Response(JSON.stringify({ error: 'Password harus diisi.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Header otorisasi tidak valid atau tidak ada.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    
    const jwt = authHeader.split(' ')[1];

    // Inisialisasi Klien Admin menggunakan Env Cloudflare
    const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE;

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Konfigurasi server tidak lengkap (Missing Supabase Credentials).' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 3. Dapatkan Pengguna dari JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Token tidak valid atau sesi telah berakhir.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // 4. Verifikasi kata sandi pengguna
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
        email: user.email!,
        password: password
    });

    if (signInError) {
        return new Response(JSON.stringify({ error: 'Password yang Anda masukkan salah.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // 5. Hapus semua data pengguna secara manual
    const { error: tasksError } = await supabaseAdmin.from('tasks').delete().eq('user_id', user.id);
    if (tasksError) throw new Error(`Gagal menghapus tugas: ${tasksError.message}`);

    // Hapus file storage
    const { data: journals } = await supabaseAdmin.from('journals').select('pdf_path').eq('user_id', user.id);
    if (journals && journals.length > 0) {
        const filePaths = journals.map((j: any) => j.pdf_path);
        await supabaseAdmin.storage.from('journal_pdfs').remove(filePaths);
    }
    
    await supabaseAdmin.from('journals').delete().eq('user_id', user.id);
    await supabaseAdmin.from('profiles').delete().eq('id', user.id);
    
    // 6. Hapus User Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw deleteError;
    }
    
    return new Response(JSON.stringify({ message: 'Akun dan semua data terkait berhasil dihapus.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Terjadi kesalahan server internal.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
