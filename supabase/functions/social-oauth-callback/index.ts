import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return new Response(
        `<html><body><h1>OAuth Error</h1><p>${error}</p><script>window.close();</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    if (!code || !state) {
      return new Response(
        `<html><body><h1>Error</h1><p>Missing code or state</p><script>window.close();</script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // Decode state to get user ID and platform
    const { userId, platform } = JSON.parse(atob(state));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-oauth-callback`;

    // Exchange code for access token
    let tokenResponse;
    let accessToken;
    let refreshToken;
    let expiresIn;
    let platformUserId;
    let username;
    let avatarUrl;

    // Platform-specific token exchange
    if (platform === "instagram" || platform === "facebook") {
      const clientId = Deno.env.get(`${platform.toUpperCase()}_CLIENT_ID`);
      const clientSecret = Deno.env.get(`${platform.toUpperCase()}_CLIENT_SECRET`);

      const tokenUrl = platform === "instagram"
        ? "https://api.instagram.com/oauth/access_token"
        : "https://graph.facebook.com/v18.0/oauth/access_token";

      const formData = new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      });

      tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      expiresIn = tokenData.expires_in;

      // Get user info
      const userInfoUrl = platform === "instagram"
        ? `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`
        : `https://graph.facebook.com/me?fields=id,name,picture&access_token=${accessToken}`;

      const userInfoResponse = await fetch(userInfoUrl);
      const userInfo = await userInfoResponse.json();
      platformUserId = userInfo.id;
      username = userInfo.username || userInfo.name;
      avatarUrl = userInfo.picture?.data?.url;
    } else if (platform === "youtube") {
      const clientId = Deno.env.get("YOUTUBE_CLIENT_ID");
      const clientSecret = Deno.env.get("YOUTUBE_CLIENT_SECRET");

      tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      expiresIn = tokenData.expires_in;

      // Get user info
      const userInfoResponse = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userInfo = await userInfoResponse.json();
      platformUserId = userInfo.items?.[0]?.id;
      username = userInfo.items?.[0]?.snippet?.title;
      avatarUrl = userInfo.items?.[0]?.snippet?.thumbnails?.default?.url;
    } else if (platform === "tiktok") {
      const clientId = Deno.env.get("TIKTOK_CLIENT_ID");
      const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");

      tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientId!,
          client_secret: clientSecret!,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      });

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.data?.access_token;
      refreshToken = tokenData.data?.refresh_token;
      expiresIn = tokenData.data?.expires_in;

      // Get user info
      const userInfoResponse = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userInfo = await userInfoResponse.json();
      platformUserId = userInfo.data?.user?.open_id;
      username = userInfo.data?.user?.display_name;
      avatarUrl = userInfo.data?.user?.avatar_url;
    } else if (platform === "x") {
      const clientId = Deno.env.get("X_CLIENT_ID");
      const clientSecret = Deno.env.get("X_CLIENT_SECRET");

      const basicAuth = btoa(`${clientId}:${clientSecret}`);

      tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${basicAuth}`,
        },
        body: new URLSearchParams({
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code_verifier: "challenge",
        }),
      });

      const tokenData = await tokenResponse.json();
      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token;
      expiresIn = tokenData.expires_in;

      // Get user info
      const userInfoResponse = await fetch(
        "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const userInfo = await userInfoResponse.json();
      platformUserId = userInfo.data?.id;
      username = userInfo.data?.username;
      avatarUrl = userInfo.data?.profile_image_url;
    }

    // Store tokens in database
    const expiresAt = new Date(Date.now() + (expiresIn || 3600) * 1000);

    await supabase.from("social_accounts").upsert(
      {
        user_id: userId,
        platform,
        username,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: expiresAt.toISOString(),
        avatar_url: avatarUrl,
        platform_user_id: platformUserId,
        connected: true,
      },
      { onConflict: "user_id,platform" }
    );

    return new Response(
      `<html><body><h1>Success!</h1><p>${platform} connected successfully!</p><script>window.opener.postMessage({type: 'oauth-success', platform: '${platform}'}, '*'); setTimeout(() => window.close(), 1000);</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    return new Response(
      `<html><body><h1>Error</h1><p>${error.message}</p><script>window.close();</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }
});