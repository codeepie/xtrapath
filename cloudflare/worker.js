/**
 * Cloudflare Worker: XtraPath Social Card & Crawler SSR Edge Interceptor
 * 
 * Features:
 * 1. Detects social preview crawlers (WhatsApp, Telegram, Discord, Facebook, Twitter/X, LinkedIn).
 * 2. Rewrites Open Graph and Twitter Card tags dynamically using Cloudflare HTMLRewriter.
 * 3. Fetches real-time post title, summary, and cover image from Supabase REST API for dynamic URLs
 *    (e.g., /views/articleView.html?id=..., /views/bookView.html?id=..., etc.).
 * 4. Ensures root favicon and apple-touch-icon are served with optimal cache headers.
 */

const SUPABASE_URL = "https://your-supabase-project.supabase.co"; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = "your-anon-key"; // Replace with your Supabase Anon Key

const CRAWLER_USER_AGENTS = [
  "whatsapp",
  "facebookexternalhit",
  "facebot",
  "twitterbot",
  "telegrambot",
  "linkedinbot",
  "discordbot",
  "slackbot",
  "skypeuripreview",
  "applebot",
  "bingbot"
];

function isCrawler(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some(bot => ua.includes(bot));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const userAgent = request.headers.get("user-agent") || "";
    const pathname = url.pathname;

    // Direct Root Favicon / Touch Icon Handling
    if (pathname === "/favicon.ico" || pathname === "/apple-touch-icon.png" || pathname === "/favicon-32.png") {
      const response = await fetch(request);
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
      headers.set("Access-Control-Allow-Origin", "*");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    // Only process HTML views for crawler bots
    const isDynamicView = pathname.includes("/views/") && (
      pathname.includes("articleView") ||
      pathname.includes("bookView") ||
      pathname.includes("courseView") ||
      pathname.includes("explainView") ||
      pathname.includes("reels") ||
      pathname.includes("researchLab")
    );

    const itemId = url.searchParams.get("id") || url.searchParams.get("post_id");

    // If not a crawler or no dynamic item ID, pass through to origin server directly
    if (!isCrawler(userAgent) || !isDynamicView || !itemId) {
      return fetch(request);
    }

    // Fetch the original response from origin
    const originResponse = await fetch(request);
    if (!originResponse.ok) {
      return originResponse;
    }

    // Fetch metadata from Supabase
    let postMeta = null;
    try {
      const supabaseEndpoint = `${env?.SUPABASE_URL || SUPABASE_URL}/rest/v1/posts?id=eq.${encodeURIComponent(itemId)}&select=title,description,video_url,format`;
      const sResponse = await fetch(supabaseEndpoint, {
        headers: {
          "apikey": env?.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${env?.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY}`
        }
      });
      if (sResponse.ok) {
        const data = await sResponse.json();
        if (Array.isArray(data) && data.length > 0) {
          postMeta = data[0];
        }
      }
    } catch (err) {
      // Fallback cleanly to origin response if Supabase fails
      return originResponse;
    }

    if (!postMeta) {
      return originResponse;
    }

    const title = postMeta.title ? `${postMeta.title} | XtraPath` : "XtraPath";
    const desc = postMeta.description || "Interactive simulation and proof on XtraPath.";
    const img = (postMeta.video_url && (postMeta.video_url.endsWith(".png") || postMeta.video_url.endsWith(".jpg") || postMeta.video_url.endsWith(".jpeg") || postMeta.video_url.endsWith(".webp"))) ? postMeta.video_url : "https://www.xtrapath.com/styles/brand-social-card.png";
    const pageUrl = url.toString();

    // Use Cloudflare HTMLRewriter to stream-modify Open Graph & Twitter Card tags
    return new HTMLRewriter()
      .on("title", {
        element(e) {
          e.setInnerContent(title);
        }
      })
      .on('meta[property="og:title"]', {
        element(e) {
          e.setAttribute("content", title);
        }
      })
      .on('meta[property="og:description"]', {
        element(e) {
          e.setAttribute("content", desc);
        }
      })
      .on('meta[property="og:image"]', {
        element(e) {
          e.setAttribute("content", img);
        }
      })
      .on('meta[property="og:image:secure_url"]', {
        element(e) {
          e.setAttribute("content", img);
        }
      })
      .on('meta[property="og:url"]', {
        element(e) {
          e.setAttribute("content", pageUrl);
        }
      })
      .on('meta[name="twitter:title"]', {
        element(e) {
          e.setAttribute("content", title);
        }
      })
      .on('meta[name="twitter:description"]', {
        element(e) {
          e.setAttribute("content", desc);
        }
      })
      .on('meta[name="twitter:image"]', {
        element(e) {
          e.setAttribute("content", img);
        }
      })
      .transform(originResponse);
  }
};
