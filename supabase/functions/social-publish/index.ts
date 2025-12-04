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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
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

    const { postId } = await req.json();

    // Get post details
    const { data: post, error: postError } = await supabase
      .from("social_posts")
      .select("*")
      .eq("id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (postError || !post) {
      return new Response(
        JSON.stringify({ error: "Post not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get connected accounts for platforms
    const { data: accounts } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", user.id)
      .in("platform", post.platforms);

    if (!accounts || accounts.length === 0) {
      await supabase
        .from("social_posts")
        .update({ status: "failed", error_message: "No connected accounts" })
        .eq("id", postId);

      return new Response(
        JSON.stringify({ error: "No connected accounts" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update to posting status
    await supabase
      .from("social_posts")
      .update({ status: "posting" })
      .eq("id", postId);

    const platformPostIds: Record<string, string> = {};
    const errors: string[] = [];

    // Publish to each platform
    for (const account of accounts) {
      try {
        let postResult;

        if (account.platform === "instagram") {
          // Instagram Graph API
          const createMediaUrl = `https://graph.facebook.com/v18.0/${account.platform_user_id}/media`;
          const createMediaResponse = await fetch(createMediaUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image_url: post.media_url,
              caption: post.caption,
              access_token: account.access_token,
            }),
          });
          const mediaData = await createMediaResponse.json();

          if (mediaData.id) {
            const publishUrl = `https://graph.facebook.com/v18.0/${account.platform_user_id}/media_publish`;
            const publishResponse = await fetch(publishUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                creation_id: mediaData.id,
                access_token: account.access_token,
              }),
            });
            postResult = await publishResponse.json();
            if (postResult.id) platformPostIds[account.platform] = postResult.id;
          }
        } else if (account.platform === "facebook") {
          // Facebook Pages API
          const url = `https://graph.facebook.com/v18.0/${account.platform_user_id}/photos`;
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: post.media_url,
              caption: post.caption,
              access_token: account.access_token,
            }),
          });
          postResult = await response.json();
          if (postResult.id) platformPostIds[account.platform] = postResult.id;
        } else if (account.platform === "youtube") {
          // YouTube Data API - video upload
          // Note: This is simplified. Real implementation needs multipart upload
          const url = "https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status";
          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              snippet: {
                title: post.caption.split('\n')[0] || "Untitled",
                description: post.caption,
              },
              status: {
                privacyStatus: "public",
              },
            }),
          });
          postResult = await response.json();
          if (postResult.id) platformPostIds[account.platform] = postResult.id;
        } else if (account.platform === "tiktok") {
          // TikTok Content Posting API
          const url = "https://open.tiktokapis.com/v2/post/publish/video/init/";
          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              post_info: {
                title: post.caption,
                privacy_level: "PUBLIC_TO_EVERYONE",
              },
              source_info: {
                source: "FILE_URL",
                video_url: post.media_url,
              },
            }),
          });
          postResult = await response.json();
          if (postResult.data?.publish_id) platformPostIds[account.platform] = postResult.data.publish_id;
        } else if (account.platform === "x") {
          // Twitter API v2
          const url = "https://api.twitter.com/2/tweets";
          const response = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${account.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: post.caption,
            }),
          });
          postResult = await response.json();
          if (postResult.data?.id) platformPostIds[account.platform] = postResult.data.id;
        }
      } catch (error) {
        errors.push(`${account.platform}: ${error.message}`);
      }
    }

    // Update post status
    const finalStatus = Object.keys(platformPostIds).length > 0 ? "posted" : "failed";
    const errorMessage = errors.length > 0 ? errors.join("; ") : null;

    await supabase
      .from("social_posts")
      .update({
        status: finalStatus,
        platform_post_ids: platformPostIds,
        error_message: errorMessage,
      })
      .eq("id", postId);

    return new Response(
      JSON.stringify({
        success: finalStatus === "posted",
        platformPostIds,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Publish error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});