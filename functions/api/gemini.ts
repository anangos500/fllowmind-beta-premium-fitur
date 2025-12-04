
import { GoogleGenAI } from '@google/genai';

// Helper untuk mendapatkan API Key dari environment variable Cloudflare
const getApiKeys = (env: any): string[] => {
    const keys: string[] = [];
    
    // Check standard API_KEY first
    if (env.API_KEY) {
        keys.push(env.API_KEY);
    }
    
    // Check for GEMINI_API_KEY (legacy/specific)
    if (env.GEMINI_API_KEY) {
        keys.push(env.GEMINI_API_KEY);
    }
    
    // Check for rotated keys
    let i = 2;
    while (env[`GEMINI_API_KEY_${i}`]) {
        const key = env[`GEMINI_API_KEY_${i}`];
        if (key) {
            keys.push(key);
        }
        i++;
    }
    return keys;
};

export const onRequestPost = async (context: any) => {
  const { request, env } = context;

  const apiKeys = getApiKeys(env);

  // Jika tidak ada kunci API yang ditemukan sama sekali
  if (apiKeys.length === 0) {
    console.error("No API keys found in environment variables.");
    return new Response(JSON.stringify({ error: 'Layanan AI tidak terkonfigurasi dengan benar di server (Missing API Key).' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();

    if (!body.model || !body.contents) {
         return new Response(JSON.stringify({ error: 'Request body harus berisi "model" dan "contents".' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
         });
    }

    let lastError: any = null;

    // Loop melalui setiap kunci API dan coba panggilannya
    for (const key of apiKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey: key });
            const response = await ai.models.generateContent(body);
            
            // Jika berhasil, segera kembalikan respons dan hentikan loop
            return new Response(JSON.stringify({ text: response.text }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });

        } catch (error: any) {
            console.warn(`Panggilan API gagal dengan kunci yang berakhir ...${key.slice(-4)}. Mencoba kunci berikutnya. Error: ${error.message}`);
            lastError = error;
            // Loop akan berlanjut ke kunci berikutnya
        }
    }

    // Jika loop selesai, berarti semua kunci gagal.
    const errorMessage = lastError?.message || 'Terjadi kesalahan yang tidak diketahui';
    console.error("All API keys failed. Last error:", errorMessage);
    
    return new Response(JSON.stringify({ 
        error: 'Gagal mendapatkan respons dari layanan AI setelah mencoba semua kunci.', 
        details: errorMessage 
    }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    const errorMessage = error.message || 'Terjadi kesalahan yang tidak diketahui';
    console.error("Unexpected error in gemini function:", errorMessage);
    return new Response(JSON.stringify({ error: 'Gagal memproses permintaan AI.', details: errorMessage }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
};
