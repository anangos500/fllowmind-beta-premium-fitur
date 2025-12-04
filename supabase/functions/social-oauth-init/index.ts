import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OAuthConfig {
  authUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { platform } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/social-oauth-callback`;
    
    // OAuth configurations for each platform
    const configs: Record<string, OAuthConfig> = {
      instagram: {
        authUrl: "https://api.instagram.com/oauth/authorize",
        clientId: Deno.env.get("INSTAGRAM_CLIENT_ID") || "",
        redirectUri,
        scope: "user_profile,user_media",
      },
      facebook: {
        authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
        clientId: Deno.env.get("FACEBOOK_CLIENT_ID") || "",
        redirectUri,
        scope: "pages_manage_posts,pages_read_engagement",
      },
      tiktok: {
        authUrl: "https://www.tiktok.com/v2/auth/authorize",
        clientId: Deno.env.get("TIKTOK_CLIENT_ID") || "",
        redirectUri,
        scope: "user.info.basic,video.publish",
      },
      youtube: {
        authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        clientId: Deno.env.get("YOUTUBE_CLIENT_ID") || "",
        redirectUri,
        scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube",
      },
      x: {
        authUrl: "https://twitter.com/i/oauth2/authorize",
        clientId: Deno.env.get("X_CLIENT_ID") || "",
        redirectUri,
        scope: "tweet.read tweet.write users.read",
      },
    };

    const config = configs[platform];
    if (!config || !config.clientId) {
      return new Response(
        JSON.stringify({
          error: `Platform ${platform} not configured. Please set the required environment variables.`,
          instructions: `You need to set ${platform.toUpperCase()}_CLIENT_ID and ${platform.toUpperCase()}_CLIENT_SECRET in your Supabase project settings.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user ID from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate state parameter with user ID
    const state = btoa(JSON.stringify({ userId: user.id, platform }));

    // Build OAuth URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scope,
      response_type: "code",
      state,
    });

    const authUrl = `${config.authUrl}?${params.toString()}`;

    return new Response(
      JSON.stringify({ authUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});