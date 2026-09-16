/**
 * AI Instafeed - Storefront Extension
 * Mirrors the admin dashboard preview container EXACTLY.
 * Polls for live config changes every 30 seconds for instant updates.
 */

(function () {
  "use strict";

  if (window.__aiInstafeedInit) return;
  window.__aiInstafeedInit = true;

  const POLL_INTERVAL = 30000;
  const MAX_FEED_ITEMS = 500;
  const PROXY_URL = "/apps/instafeed/data";
  const ANALYTICS_URL = "/apps/instafeed/analytics";
  const STORAGE_KEY = "ai_instafeed_cache_v2";
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 mins

  let hasTrackedView = false;
  let cachedConfig = null;
  let cachedGridMedia = [];
  let cachedStoryMedia = [];
  let cachedInstaData = null;

  function getStoredCache() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.config && (Date.now() - parsed.timestamp < CACHE_TTL_MS)) {
        return parsed;
      }
    } catch (_) {}
    return null;
  }

  function setStoredCache(config, instaData) {
    try {
      const payload = JSON.stringify({ config, instaData, timestamp: Date.now() });
      sessionStorage.setItem(STORAGE_KEY, payload);
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (_) {}
  }

  function trackEvent(eventType) {
    try {
      const shopDomain = (window.Shopify && window.Shopify.shop) || window.location.hostname;
      const payload = JSON.stringify({ shop: shopDomain, event: eventType });
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(ANALYTICS_URL, blob);
      } else {
        fetch(ANALYTICS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
          credentials: "same-origin",
        }).catch(function () {});
      }
    } catch (_) {}
  }

  function setupViewIntersectionObserver() {
    if (hasTrackedView || typeof IntersectionObserver === "undefined") return;
    try {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !hasTrackedView) {
            hasTrackedView = true;
            trackEvent("view");
            observer.disconnect();
          }
        });
      }, { threshold: 0.15 });

      const targets = document.querySelectorAll("instafeed-grid, instafeed-story");
      targets.forEach(function (el) { observer.observe(el); });
    } catch (_) {}
  }

  // Helper to find the stylesheet link URL in host page fallback
  function getCssUrl() {
    const link = document.querySelector('link[href*="instafeed-front.css"]');
    if (link) return link.getAttribute('href') || link.href || '';
    const script = document.querySelector('script[src*="instafeed-front.js"]');
    if (script && script.src) return script.src.replace('instafeed-front.js', 'instafeed-front.css');
    return '';
  }

  // ── Sample media (same as backend dashboard lookbook) ─────────────────────
  const SAMPLE_MEDIA = [
    {
      id: "placeholder_1",
      media_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=800&fit=crop",
      thumbnail_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=800&fit=crop",
      media_type: "IMAGE",
      caption: "Our signature Silk Slip Dress in Champagne Gold ✨ Designed for effortless day-to-night styling. #ootd #summerstyle #silkdress",
      like_count: 342,
      comments_count: 18,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_2",
      media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      thumbnail_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=800&fit=crop",
      media_type: "VIDEO",
      caption: "Behind the scenes at our Autumn Lookbook shoot 🍂 Discover the collection online now. #behindthescenes #fashionfilm",
      like_count: 812,
      comments_count: 45,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_3",
      media_url: "https://images.unsplash.com/photo-1539106604-24283ef1677b?w=800&h=800&fit=crop",
      thumbnail_url: "https://images.unsplash.com/photo-1539106604-24283ef1677b?w=800&h=800&fit=crop",
      media_type: "IMAGE",
      caption: "Minimalist tailoring for every occasion. Styled with our handcrafted leather bucket bag 🤍 #streetstyle #minimalist",
      like_count: 420,
      comments_count: 24,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_4",
      media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      thumbnail_url: "https://images.unsplash.com/photo-1529139513364-c4d1221e93c0?w=800&h=800&fit=crop",
      media_type: "VIDEO",
      caption: "Sunset styling session in Los Angeles 🌅 Which look is your favorite? 1, 2, or 3? #reels #outfitinspo",
      like_count: 1240,
      comments_count: 89,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_5",
      media_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&h=800&fit=crop",
      thumbnail_url: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800&h=800&fit=crop",
      media_type: "IMAGE",
      caption: "Weekend essentials: Oversized Linen Shirt in crisp white. Breathable, relaxed, perfected 🌿 #linenlove #summercapsule",
      like_count: 518,
      comments_count: 31,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_6",
      media_url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&h=800&fit=crop",
      thumbnail_url: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&h=800&fit=crop",
      media_type: "IMAGE",
      caption: "Monochrome moments. The tailored Wide-Leg Pant paired with our ribbed knit tank 🖤 #parisianstyle #capsulewardrobe",
      like_count: 673,
      comments_count: 40,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_7",
      media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      thumbnail_url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&h=800&fit=crop",
      media_type: "VIDEO",
      caption: "How our community wears the Cloud Soft Cardigan 🧶 Swipe for styling ideas! #community #lookbook",
      like_count: 940,
      comments_count: 67,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_8",
      media_url: "https://images.unsplash.com/photo-1529139513364-c4d1221e93c0?w=800&h=800&fit=crop",
      thumbnail_url: "https://images.unsplash.com/photo-1529139513364-c4d1221e93c0?w=800&h=800&fit=crop",
      media_type: "IMAGE",
      caption: "Sculptural accessories to elevate any outfit. Handcrafted brass earrings now online ✨ #jewelrylovers #statementjewelry",
      like_count: 380,
      comments_count: 22,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_9",
      media_url: "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&h=800&fit=crop",
      thumbnail_url: "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=800&h=800&fit=crop",
      media_type: "IMAGE",
      caption: "Clean lines, timeless palette. The Classic Trench in Sandstone 🍂 #autumnlayers #classicstyle",
      like_count: 685,
      comments_count: 28,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_10",
      media_url: "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=800&h=800&fit=crop",
      thumbnail_url: "https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?w=800&h=800&fit=crop",
      media_type: "IMAGE",
      caption: "Coffee runs in our Oversized Crewneck ☕️ Cozy season has officially arrived. #casualchic #cozyvibes",
      like_count: 490,
      comments_count: 17,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_11",
      media_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
      thumbnail_url: "https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=800&h=800&fit=crop",
      media_type: "VIDEO",
      caption: "Morning skincare rituals with our antioxidant glow duo 🍊 Watch the texture melt in. #skincaretips #glowingskin",
      like_count: 1120,
      comments_count: 75,
      permalink: "https://instagram.com",
    },
    {
      id: "placeholder_12",
      media_url: "https://images.unsplash.com/photo-1485230895905-ec17bd36b5cc?w=800&h=800&fit=crop",
      thumbnail_url: "https://images.unsplash.com/photo-1485230895905-ec17bd36b5cc?w=800&h=800&fit=crop",
      media_type: "IMAGE",
      caption: "Soft tailoring for modern living. Designed to transition from day to evening seamlessly 🌙 #effortlessstyle",
      like_count: 560,
      comments_count: 32,
      permalink: "https://instagram.com",
    },
  ];

  function getMedia(mediaData, count) {
    let validItems = [];
    if (mediaData && mediaData.length > 0) {
      validItems = mediaData.filter(i => i && (i.media_url || i.thumbnail_url));
    }
    if (validItems.length === 0) {
      validItems = SAMPLE_MEDIA;
    }
    return validItems.slice(0, Math.min(count, MAX_FEED_ITEMS));
  }

  function esc(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatDynamicAccountText(str, handle) {
    if (!str) return "";
    const cleanHandle = (handle || "").replace("@", "").trim();
    const replacement = cleanHandle ? `@${cleanHandle}` : "@gpmbazaar";
    return String(str).replace(/@account/gi, replacement);
  }

  function checkTrackOverflow(track, wrapper) {
    if (!track || !wrapper) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const prevBtn = wrapper.querySelector(".ai-fw-prev");
    const nextBtn = wrapper.querySelector(".ai-fw-next");

    // Prevent flexbox left-clipping on overflowing tracks
    if (maxScroll > 5) {
      track.style.setProperty("justify-content", "flex-start", "important");
    } else {
      track.style.setProperty("justify-content", "center", "important");
    }

    if (maxScroll <= 5) {
      if (prevBtn) prevBtn.style.setProperty("display", "none", "important");
      if (nextBtn) nextBtn.style.setProperty("display", "none", "important");
      return;
    }

    const currentScroll = track.scrollLeft;

    if (prevBtn) {
      prevBtn.style.setProperty("display", "flex", "important");
      if (currentScroll <= 5) {
        prevBtn.style.opacity = "0.35";
        prevBtn.style.pointerEvents = "none";
        prevBtn.setAttribute("aria-disabled", "true");
      } else {
        prevBtn.style.opacity = "1";
        prevBtn.style.pointerEvents = "auto";
        prevBtn.removeAttribute("aria-disabled");
      }
    }

    if (nextBtn) {
      nextBtn.style.setProperty("display", "flex", "important");
      if (currentScroll >= maxScroll - 5) {
        nextBtn.style.opacity = "0.35";
        nextBtn.style.pointerEvents = "none";
        nextBtn.setAttribute("aria-disabled", "true");
      } else {
        nextBtn.style.opacity = "1";
        nextBtn.style.pointerEvents = "auto";
        nextBtn.removeAttribute("aria-disabled");
      }
    }
  }

  function bindCarouselNav(root) {
    const wrapper = root.querySelector(".ai-fw-carousel-wrapper");
    const track = root.querySelector(".ai-fw-track");
    
    if (track && wrapper) {
      // Ensure scrolling always starts at the first block
      track.scrollLeft = 0;
      setTimeout(() => {
        if (track) track.scrollLeft = 0;
        checkTrackOverflow(track, wrapper);
      }, 50);
      setTimeout(() => {
        if (track) track.scrollLeft = 0;
        checkTrackOverflow(track, wrapper);
      }, 300);
      
      if (window.ResizeObserver) {
        const observer = new ResizeObserver(() => {
          checkTrackOverflow(track, wrapper);
        });
        observer.observe(track);
        if (track.__resizeObserver) {
          track.__resizeObserver.disconnect();
        }
        track.__resizeObserver = observer;
      }

      if (!track.__dragBound) {
        track.__dragBound = true;
        let isDown = false;
        let startX = 0;
        let scrollStart = 0;

        track.addEventListener("pointerdown", (e) => {
          if (e.target.closest(".ai-fw-nav")) return;
          // For touch screens, let native momentum scrolling work seamlessly without blocking vertical scroll
          if (e.pointerType === "touch") return;
          isDown = true;
          track.style.cursor = "grabbing";
          track.style.userSelect = "none";
          startX = e.pageX - track.offsetLeft;
          scrollStart = track.scrollLeft;
        });

        track.addEventListener("pointerleave", () => {
          isDown = false;
          track.style.cursor = "";
          track.style.userSelect = "";
        });

        track.addEventListener("pointerup", () => {
          isDown = false;
          track.style.cursor = "";
          track.style.userSelect = "";
        });

        track.addEventListener("pointermove", (e) => {
          if (!isDown) return;
          e.preventDefault();
          const x = e.pageX - track.offsetLeft;
          const walk = (x - startX) * 1.5;
          track.scrollLeft = scrollStart - walk;
        });

        track.setAttribute("tabindex", "0");
        track.addEventListener("keydown", (e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            const amount = track.clientWidth * 0.6;
            track.scrollBy({ left: -amount, behavior: "smooth" });
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            const amount = track.clientWidth * 0.6;
            track.scrollBy({ left: amount, behavior: "smooth" });
          }
        });
      }

      if (!track.__navScrollBound) {
        track.__navScrollBound = true;
        track.addEventListener("scroll", () => {
          checkTrackOverflow(track, wrapper);
        });
      }
    }

    root.querySelectorAll(".ai-fw-nav").forEach((btn) => {
      btn.setAttribute("tabindex", "0");
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      });
      btn.addEventListener("click", () => {
        const trackId = btn.getAttribute("data-track-id");
        const track   = trackId ? root.querySelector("#" + trackId) : null;
        if (!track) return;
        const amount = track.clientWidth * 0.8;
        const isPrev = btn.classList.contains("ai-fw-prev");

        track.scrollBy({ left: isPrev ? -amount : amount, behavior: "smooth" });
        setTimeout(() => checkTrackOverflow(track, wrapper), 200);
        setTimeout(() => checkTrackOverflow(track, wrapper), 400);
      });
    });
  }

  // ── InstafeedGrid Custom Element ───────────────────────────────────────────
  class InstafeedGrid extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.currentDisplayLimit = 0;
      this.infiniteObserver = null;
      this.config = null;
      this.mediaData = null;
      this.instaData = null;
    }

    connectedCallback() {
      if (cachedConfig && cachedGridMedia) {
        this.render(cachedConfig, cachedGridMedia, cachedInstaData);
      }
      this._handleClickBound = this._handleClickBound || this._handleClick.bind(this);
      this.shadowRoot.addEventListener("click", this._handleClickBound);
    }

    disconnectedCallback() {
      this.shadowRoot.removeEventListener("click", this._handleClickBound);
      if (this.infiniteObserver) {
        this.infiniteObserver.disconnect();
      }
    }

    _handleClick(e) {
      const storyItem = e.target.closest(".ai-story-item");
      if (storyItem) {
        trackEvent('click');
        if (storyItem.classList.contains("ai-promo-item")) {
          return;
        }
        const isPopup = this.config?.stories?.openPopup !== false;
        if (!isPopup) return;
        e.preventDefault();
        const itemId = storyItem.getAttribute("data-id");
        this.dispatchEvent(new CustomEvent("instafeed:open-modal", {
          bubbles: true,
          composed: true,
          detail: {
            id: itemId,
            source: "story",
            media: this.storyMedia || this.mediaData || cachedGridMedia || [],
            config: this.config || cachedConfig || {},
            cssUrl: this.getAttribute("css-url") || getCssUrl()
          }
        }));
        return;
      }

      const gridItem = e.target.closest(".ai-grid-item");
      if (gridItem) {
        trackEvent('click');
        const isPopup = this.config?.postFeed?.openPopup !== false;
        if (!isPopup) return;
        e.preventDefault();
        const itemId = gridItem.getAttribute("data-id");
        this.dispatchEvent(new CustomEvent("instafeed:open-modal", {
          bubbles: true,
          composed: true,
          detail: {
            id: itemId,
            source: "grid",
            media: this.mediaData || cachedGridMedia || [],
            config: this.config || cachedConfig || {},
            cssUrl: this.getAttribute("css-url") || getCssUrl()
          }
        }));
      }
    }

    render(config, mediaData, instaData) {
      this.config = config;
      this.mediaData = mediaData;
      if (instaData !== undefined) {
        this.instaData = instaData;
      } else if (!this.instaData && cachedInstaData) {
        this.instaData = cachedInstaData;
      }

      const c          = config.postFeed || {};
      const isMobile   = window.innerWidth <= 768;
      const columns    = isMobile ? (Number(c.mobileColumns) || 2) : (Number(c.desktopColumns) || 4);
      const baseLimit  = isMobile ? (Number(c.mobileLimit) || 4) : (Number(c.desktopLimit) || 8);
      const layoutMode = c.layoutMode || c.layoutStyle || (c.carousel ? "carousel" : "grid");
      const isCarousel = layoutMode === "carousel";
      // Infinite scroll only on carousel; all other layouts display strictly limited posts
      const limit      = isCarousel ? Math.max(baseLimit, this.currentDisplayLimit || baseLimit) : baseLimit;

      if (!isCarousel) {
        this.currentDisplayLimit = 0;
        if (this.infiniteObserver) {
          this.infiniteObserver.disconnect();
          this.infiniteObserver = null;
        }
      }

      // Smart Media Separation: Story media (images default) & Feed media (videos default)
      const feedSource = (mediaData && mediaData.length > 0) ? mediaData : SAMPLE_MEDIA;
      const totalPosts = feedSource.length;
      const showStories = (totalPosts >= 6 || totalPosts === 0) && config.stories?.enable !== false;
      let storyMedia = [];
      if (showStories) {
        storyMedia = feedSource.filter(i => {
          const t = (i.media_type || "").toUpperCase();
          return t === "IMAGE" || t === "CAROUSEL_ALBUM" || t === "ALBUM";
        });
        if (storyMedia.length === 0) storyMedia = feedSource; // fallback
        this.storyMedia = storyMedia;
      }

      // Feed Media: Filter for videos/reels by default with fallback to all media if 0 videos
      const feedFilter = c.mediaTypeFilter || "all";
      let candidateFeed = feedSource;
      if (feedFilter === "videos") {
        const vids = feedSource.filter(i => {
          const t = (i.media_type || "").toUpperCase();
          return t === "VIDEO" || t === "REEL" || (i.media_url && i.media_url.toLowerCase().includes(".mp4"));
        });
        candidateFeed = vids.length > 0 ? vids : feedSource;
      } else if (feedFilter === "images") {
        const imgs = feedSource.filter(i => {
          const t = (i.media_type || "").toUpperCase();
          return t === "IMAGE" || t === "CAROUSEL_ALBUM" || t === "ALBUM";
        });
        candidateFeed = imgs.length > 0 ? imgs : feedSource;
      }

      const gap        = c.gap;
      const mediaItems = getMedia(candidateFeed, limit);
      const trackId    = 'ai-fw-grid-track-' + Date.now();

      // 1. Header: Title & Description & Contextual Follow Button
      const igHandle = (config.instagramHandle || (this.instaData && this.instaData.username) || "").replace("@", "").trim();
      const followPosition = c.followButtonPosition || (config.appliedTemplateId?.includes("profile") ? "header" : (c.heading?.startsWith("@") ? "header" : "bottom"));
      const showFollowInHeader = igHandle && c.showFollowButton !== false && followPosition === "header";
      const showFollowAtBottom = igHandle && c.showFollowButton !== false && followPosition === "bottom";

      const isProfileLayout = Boolean(
        config.appliedTemplateId?.includes("profile") ||
        (followPosition === "header" && (
          c.heading?.startsWith("@") ||
          c.heading?.toLowerCase().includes("@account") ||
          c.heading?.toLowerCase().includes("follow @") ||
          c.heading?.toLowerCase().includes("connect with @") ||
          c.heading?.toLowerCase().includes("welcome to @")
        ))
      );

      const hSize      = isMobile 
        ? (isProfileLayout ? Math.min(c.typography?.heading?.size || 14, 13) : Math.min(c.typography?.heading?.size || 18, 16))
        : (isProfileLayout ? (c.typography?.heading?.size || 16) : (c.typography?.heading?.size || 18));
      const subSize    = isMobile 
        ? (isProfileLayout ? Math.min(c.typography?.subheading?.size || 11, 10.5) : Math.min(c.typography?.subheading?.size || 12, 11.5))
        : (isProfileLayout ? (c.typography?.subheading?.size || 12) : (c.typography?.subheading?.size || 12));
      const cssUrl     = this.getAttribute("css-url") || getCssUrl();

      let styleLink = "";
      if (cssUrl) {
        styleLink = `<link rel="stylesheet" href="${cssUrl}">`;
      }

      let html = styleLink + '<div class="ai-instafeed-root" style="font-family:inherit;width:100%;max-width:1200px;margin:0 auto;box-sizing:border-box;padding-top:' + (c.paddingTop ?? 32) + 'px;padding-bottom:' + (c.paddingBottom ?? 32) + 'px;">';

      if (isProfileLayout && ((c.header && ((c.heading && c.heading.trim()) || (c.subheading && c.subheading.trim()))) || showFollowInHeader)) {
        const profilePic = (this.instaData && (this.instaData.profile_picture_url || (this.instaData.user && this.instaData.user.profile_picture_url))) || "";

        html += '<div class="ai-profile-header-wrap" style="display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px;width:100%;box-sizing:border-box;">';

        // Left side: Profile Avatar + Text Content (heading + subheading)
        html += '<div class="ai-profile-header-left" style="display:flex;align-items:center;gap:14px;min-width:0;flex:1;">';

        // Avatar circle
        html += '<div class="ai-profile-avatar-wrap" style="width:46px;height:46px;min-width:46px;min-height:46px;border-radius:50%;overflow:hidden;background:linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);padding:2px;box-sizing:border-box;box-shadow:0 1px 3px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">';
        if (profilePic) {
          html += '<img src="' + esc(profilePic) + '" alt="' + esc(igHandle || 'Instagram Profile') + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">';
        } else {
          html += '<div style="width:100%;height:100%;border-radius:50%;background:#ffffff;display:flex;align-items:center;justify-content:center;">'
                + '<svg width="20" height="20" viewBox="0 0 24 24" fill="#833ab4"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>'
                + '</div>';
        }
        html += '</div>';

        // Content on Left
        html += '<div class="ai-profile-header-text" style="text-align:left;min-width:0;flex:1;">';
        if (c.header && c.heading && c.heading.trim()) {
          html += '<h2 style="font-size:' + hSize + 'px;font-weight:' + (c.typography?.heading?.weight || '800') + ';color:' + (c.typography?.heading?.color || '#000') + ';margin:0 0 2px 0;line-height:1.25;word-break:break-word;">' + esc(formatDynamicAccountText(c.heading, config.instagramHandle || (this.instaData && this.instaData.username))) + '</h2>';
        }
        if (c.header && c.subheading && c.subheading.trim()) {
          html += '<p style="font-size:' + subSize + 'px;font-weight:' + (c.typography?.subheading?.weight || '500') + ';color:' + (c.typography?.subheading?.color || '#666') + ';margin:0;line-height:1.3;word-break:break-word;">' + esc(formatDynamicAccountText(c.subheading, config.instagramHandle || (this.instaData && this.instaData.username))) + '</p>';
        }
        html += '</div>';
        html += '</div>'; // End Left side

        // Right side: Follow Button
        if (showFollowInHeader) {
          html += '<div class="ai-profile-header-right" style="flex-shrink:0;margin-left:auto;">'
                + '<a href="https://instagram.com/' + esc(igHandle) + '" target="_blank" rel="noopener noreferrer" class="ai-follow-btn" style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:18px;background:linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);color:#ffffff;font-weight:700;font-size:11.5px;text-decoration:none;box-shadow:0 2px 4px rgba(0,0,0,0.1);white-space:nowrap;">'
                + '<svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>'
                + '<span>Follow</span>'
                + '</a></div>';
        }

        html += '</div>';
      } else if ((c.header && ((c.heading && c.heading.trim()) || (c.subheading && c.subheading.trim()))) || showFollowInHeader) {
        html += '<div style="text-align:' + c.alignment + ';margin-bottom:20px;">';
        if (c.header && c.heading && c.heading.trim()) {
          html += '<h2 style="font-size:' + hSize + 'px;font-weight:' + (c.typography?.heading?.weight || '800') + ';color:' + (c.typography?.heading?.color || '#000') + ';margin:0 0 8px 0;line-height:1.2;">' + esc(formatDynamicAccountText(c.heading, config.instagramHandle)) + '</h2>';
        }
        if (c.header && c.subheading && c.subheading.trim()) {
          html += '<p style="font-size:' + subSize + 'px;font-weight:' + (c.typography?.subheading?.weight || '500') + ';color:' + (c.typography?.subheading?.color || '#666') + ';margin:0;">' + esc(formatDynamicAccountText(c.subheading, config.instagramHandle)) + '</p>';
        }
        if (showFollowInHeader) {
          html += '<div style="margin-top:12px;">'
                + '<a href="https://instagram.com/' + esc(igHandle) + '" target="_blank" rel="noopener noreferrer" class="ai-follow-btn" style="display:inline-flex;align-items:center;gap:6px;padding:5px 14px;border-radius:16px;background:linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%);color:#ffffff;font-weight:700;font-size:11.5px;text-decoration:none;">'
                + '<svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>'
                + '<span>Follow on Instagram</span>'
                + '</a></div>';
        }
        html += '</div>';
      }

      // 2. Story Highlights Bar (images by default, threshold >= 6 posts)
      if (showStories && storyMedia.length > 0) {
        const s = config.stories || {};
        const sRingColor = s.ringColor || c.typography?.heading?.color || "#e1306c";
        const sActiveRing = s.activeRing !== false;
        const sTrackId = 'ai-story-subtrack-' + Date.now();
        const displayStories = getMedia(storyMedia, 10);
        
        html += '<div class="ai-fw-carousel-wrapper" style="position:relative;width:100%;margin-bottom:20px;">'
              + '<div id="' + sTrackId + '" class="ai-fw-track" style="display:flex;width:100%;justify-content:flex-start;overflow-x:auto;scroll-behavior:smooth;scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;gap:12px;padding:4px 16px 16px;">';
        
        if (s.promoEnable !== false) {
          html += '<div class="ai-story-item ai-promo-item" style="flex-shrink:0;width:64px;min-width:64px;text-align:center;cursor:pointer;overflow:visible;">'
                + '<a href="javascript:void(0)" style="text-decoration:none;display:block;width:100%;">'
                + '<div class="ai-story-ring-wrapper" style="width:64px;height:64px;border-radius:50%;padding:3px;border:' + (sActiveRing ? 'none' : '2px solid ' + sRingColor) + ';background:white;margin:0 auto;position:relative;">'
                + (sActiveRing ? '<svg class="ai-story-ring-svg ' + (s.pulseRing === true ? 'ai-story-ring-pulse' : '') + '" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><circle class="ai-story-ring-circle" cx="50" cy="50" r="47.5" stroke="' + sRingColor + '" /></svg>' : '')
                + '<div class="ai-story-image-container" style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:linear-gradient(135deg, #e1306c 0%, #c13584 50%, #f77737 100%);display:flex;align-items:center;justify-content:center;position:relative;z-index:1;">'
                + '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>'
                + '</div></div>'
                + '</a></div>';
        }

        displayStories.forEach((item, i) => {
          const thumb = item.thumbnail_url || item.media_url || "";

          html += '<div class="ai-story-item" data-id="' + (item.id || (item.media_url ? item.media_url.slice(-20) : '')) + '" style="flex-shrink:0;width:64px;text-align:center;cursor:pointer;overflow:visible;">'
                + '<a href="javascript:void(0)" style="text-decoration:none;display:block;width:100%;">'
                + '<div class="ai-story-ring-wrapper" style="width:64px;height:64px;border-radius:50%;padding:3px;border:' + (sActiveRing ? 'none' : '2px solid ' + sRingColor) + ';background:white;margin:0 auto;position:relative;">'
                + (sActiveRing ? '<svg class="ai-story-ring-svg ' + (s.pulseRing === true ? 'ai-story-ring-pulse' : '') + '" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><circle class="ai-story-ring-circle" cx="50" cy="50" r="47.5" stroke="' + sRingColor + '" /></svg>' : '')
                + '<div class="ai-story-image-container" style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:#f1f5f9;position:relative;z-index:1;">'
                + (thumb ? '<img loading="lazy" src="' + esc(thumb) + '" alt="Story highlight" style="width:100%;height:100%;object-fit:cover;display:block;">' : '<div class="ai-skeleton-tile"></div>')
                + '</div></div>'
                + '</a></div>';
        });

        html += '</div></div>';
      }

      // 3. Feed Display Modes: Grid, Carousel, Masonry, Highlight, Reels, Marquee
      if (layoutMode === "carousel") {
        const itemWidth = 'calc((100% - ' + ((columns - 1) * gap) + 'px) / ' + columns + ')';
        const navBtnStyle = 'outline:none!important;-webkit-appearance:none!important;appearance:none!important;color:#1e293b!important;';
        html += '<div class="ai-fw-carousel-wrapper" style="position:relative;width:100%;">'
              + '<div class="ai-fw-nav ai-fw-prev" data-track-id="' + trackId + '" role="button" tabindex="0" aria-label="Previous" style="' + navBtnStyle + '"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e293b" stroke-width="2"><path d="M12 16l-4-4 4-4"/></svg></div>'
              + '<div class="ai-fw-track" id="' + trackId + '" style="display:flex;justify-content:center;overflow-x:auto;scroll-behavior:smooth;scrollbar-width:none;gap:' + gap + 'px;padding:' + gap + 'px 0;">';
        mediaItems.forEach((item, index) => { html += this.renderMediaCard(item, c, itemWidth, '', index); });
        
        if (mediaData.length > limit) {
          html += '<div id="ai-infinite-sentinel" style="flex-shrink:0;width:60px;display:flex;align-items:center;justify-content:center;">'
                + '<div style="width:20px;height:20px;border:2px solid #ddd;border-top-color:#6366f1;border-radius:50%;animation:ai-spin 0.8s linear infinite;"></div>'
                + '</div>';
        }
        html += '</div>'
              + '<div class="ai-fw-nav ai-fw-next" data-track-id="' + trackId + '" role="button" tabindex="0" aria-label="Next" style="' + navBtnStyle + '"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e293b" stroke-width="2"><path d="M8 16l4-4-4-4"/></svg></div>'
              + '</div>';
      } else if (layoutMode === "masonry") {
        const MASONRY_ASPECTS = ["4/5", "4/3", "4/3", "4/5", "3/4", "16/10", "1/1", "4/5"];
        html += '<div class="ai-layout-masonry" style="column-count:' + columns + ';--ai-gap:' + gap + 'px;">';
        mediaItems.forEach((item, index) => {
          const masonryAspect = (c.aspectRatio && c.aspectRatio !== "auto") ? c.aspectRatio : MASONRY_ASPECTS[index % MASONRY_ASPECTS.length];
          const masonryConfig = { ...c, aspectRatio: masonryAspect };
          html += this.renderMediaCard(item, masonryConfig, '100%', 'ai-masonry-item', index);
        });
        html += '</div>';
      } else if (layoutMode === "highlight") {
        const highlightCols = isMobile ? 2 : 4;
        html += '<div class="ai-layout-highlight" style="grid-template-columns:repeat(' + highlightCols + ',1fr);gap:' + gap + 'px;">';
        // Highlight layout: 1 large hero (2x2) + 4 square tiles = exactly 5 posts (remove last 3 posts)
        const highlightItems = mediaItems.slice(0, 5);
        const highlightConfig = { ...c, aspectRatio: "1/1" };
        highlightItems.forEach((item, index) => {
          const isHero = index === 0;
          html += this.renderMediaCard(item, highlightConfig, '100%', isHero ? 'ai-highlight-hero' : '', index);
        });
        html += '</div>';
      } else if (layoutMode === "reels") {
        const reelWidth = isMobile ? 'calc((100% - ' + gap + 'px) / 2)' : 'calc((100% - ' + ((columns - 1) * gap) + 'px) / ' + columns + ')';
        const navBtnStyle = 'outline:none!important;-webkit-appearance:none!important;appearance:none!important;color:#1e293b!important;';
        html += '<div class="ai-layout-reels ai-fw-carousel-wrapper" style="position:relative;width:100%;">'
              + '<div class="ai-fw-nav ai-fw-prev" data-track-id="' + trackId + '" role="button" tabindex="0" aria-label="Previous" style="' + navBtnStyle + '"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e293b" stroke-width="2"><path d="M12 16l-4-4 4-4"/></svg></div>'
              + '<div class="ai-fw-track" id="' + trackId + '" style="display:flex;overflow-x:auto;scroll-behavior:smooth;scrollbar-width:none;gap:' + gap + 'px;padding:' + gap + 'px 0;">';
        mediaItems.forEach((item, index) => {
          const reelConfig = { ...c, aspectRatio: "9/16", autoplay: c.autoplay !== false };
          html += this.renderMediaCard(item, reelConfig, reelWidth, '', index);
        });
        html += '</div>'
              + '<div class="ai-fw-nav ai-fw-next" data-track-id="' + trackId + '" role="button" tabindex="0" aria-label="Next" style="' + navBtnStyle + '"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1e293b" stroke-width="2"><path d="M8 16l4-4-4-4"/></svg></div>'
              + '</div>';
      } else if (layoutMode === "marquee") {
        const itemWidth = isMobile ? '160px' : '220px';
        const speed = c.marqueeSpeed || 32;
        html += '<div class="ai-marquee-wrapper" style="--ai-gap:' + gap + 'px;--ai-marquee-speed:' + speed + 's;margin:' + gap + 'px 0;">'
              + '<div class="ai-marquee-track">';
        // Render items and duplicate once to achieve seamless infinite loop
        mediaItems.forEach((item, index) => { html += this.renderMediaCard(item, c, itemWidth, 'ai-marquee-item', index); });
        mediaItems.forEach((item, index) => { html += this.renderMediaCard(item, c, itemWidth, 'ai-marquee-item', index + mediaItems.length); });
        html += '</div></div>';
      } else {
        // Default Grid layout
        html += '<div id="ai-grid-body" style="display:grid;grid-template-columns:repeat(' + columns + ',1fr);justify-content:center;gap:' + gap + 'px;">';
        mediaItems.forEach((item, index) => { html += this.renderMediaCard(item, c, '100%', '', index); });
        html += '</div>';
      }

      if (!c.removeWatermark) {
        const logoUrl = this.getAttribute("data-logo-url") || "";
        if (logoUrl) {
          html += '<div style="text-align:center;padding:16px;font-size:12px;color:#9ca3af;"><a href="https://apps.shopify.com/ai-instafeed" target="_blank" rel="noopener noreferrer" style="display:inline-block;vertical-align:middle;"><img src="' + logoUrl + '" style="height:16px !important;width:auto !important;max-width:none !important;max-height:16px !important;vertical-align:middle !important;display:inline-block !important;" alt="BOOST STAR Experts" /></a></div>';
        } else {
          html += '<div style="text-align:center;padding:16px;font-size:12px;color:#9ca3af;"><a href="https://apps.shopify.com/ai-instafeed" target="_blank" rel="noopener noreferrer" style="font-weight:700;color:#64748b;text-decoration:none;">BOOST STAR Experts</a></div>';
        }
      }

      if (showFollowAtBottom) {
        html += '<div style="text-align:center;margin-top:20px;margin-bottom:12px;">'
              + '<a href="https://instagram.com/' + esc(igHandle) + '" target="_blank" rel="noopener noreferrer" class="ai-follow-btn">'
              + '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>'
              + '<span>Follow on Instagram</span>'
              + '</a></div>';
      }

      html += '</div>';
      this.shadowRoot.innerHTML = html;
      bindCarouselNav(this.shadowRoot);

      if (isCarousel && mediaData.length > limit) {
        this.setupInfiniteScroll(config, mediaData);
      }
    }

    renderMediaCard(item, c, width, extraClass = "", index = 0) {
      const fallbackItem = SAMPLE_MEDIA[index % SAMPLE_MEDIA.length] || SAMPLE_MEDIA[0];
      const rawType   = (item.media_type || fallbackItem.media_type || "").toUpperCase();
      const mediaUrl  = item.media_url || fallbackItem.media_url || "";
      const thumbUrl  = item.thumbnail_url || fallbackItem.thumbnail_url || "";
      const isVideo   = rawType === "VIDEO" || rawType === "REEL" || (mediaUrl && mediaUrl.toLowerCase().includes(".mp4"));
      const isAlbum   = rawType === "CAROUSEL_ALBUM" || rawType === "ALBUM";
      const posterAttr = thumbUrl ? ` poster="${esc(thumbUrl)}"` : "";
      const isPriority = index < 4;
      const loadAttr  = isPriority ? 'loading="eager" fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';

      let inner = "";
      if (isVideo && mediaUrl) {
        if (c.autoplay !== false) {
          inner = `<video src="${esc(mediaUrl)}"${posterAttr} autoplay muted loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
        } else if (thumbUrl) {
          inner = `<img ${loadAttr} src="${esc(thumbUrl)}" alt="Instagram post" style="width:100%;height:100%;object-fit:cover;display:block;">`;
        } else {
          inner = `<video src="${esc(mediaUrl)}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
        }
      } else if (mediaUrl) {
        inner = `<img ${loadAttr} src="${esc(mediaUrl)}" alt="Instagram post" style="width:100%;height:100%;object-fit:cover;display:block;">`;
      } else {
        inner = `<img ${loadAttr} src="${esc(fallbackItem.media_url)}" alt="Instagram post" style="width:100%;height:100%;object-fit:cover;display:block;">`;
      }
      const metrics = c.metrics ? `
        <div style="display:flex;align-items:center;gap:6px;">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="white"><path d="M14.5 3c-1.2 0-2.3.6-3 1.5-.7-.9-1.8-1.5-3-1.5-1.2 0-2.6.4-3.2 2-.6 1.6.2 3.7 1.8 5.4 1.5 1.6 4.4 4.1 4.4 4.1s2.9-2.5 4.4-4.1c1.6-1.7 2.4-3.8 1.8-5.4-.6-1.6-2-2-3.2-2z"/></svg>
          <span>${item.like_count || 0}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="white"><path d="M17 14c-.5 0-1 .4-1 1v2H4V5h12v2c0 .5.4 1 1 1s1-.5 1-1V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2-2 2h12.6l2.7 2.7c.1.1.2.2.3.2.4.1.8-.1 1-.5V8c0-.5-.4-1-1-1s-1 .4-1 1v6c0 .5-.4 1-1 1z"/></svg>
          <span>${item.comments_count || 0}</span>
        </div>` : "";
      const aspect = (c.aspectRatio && c.aspectRatio !== "auto") ? c.aspectRatio : (c.aspectRatio === "auto" ? "auto" : "1/1");
      const itemStyle = (aspect !== "auto") ? `aspect-ratio:${aspect};` : "";

      const taggedList = (this.config && this.config.taggedProducts && (this.config.taggedProducts[item.id] || this.config.taggedProducts[item.media_url])) || [];
      const shoppableBadge = (taggedList.length > 0) ? `
        <div class="ai-shoppable-badge" style="position:absolute;top:8px;left:8px;z-index:11;background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);color:#fff;padding:2px 7px;border-radius:10px;font-size:9.5px;font-weight:700;display:inline-flex;align-items:center;gap:4px;box-shadow:0 2px 4px rgba(0,0,0,0.15);">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3.8 6l1.5-2h13.4l1.5 2zm14.2 4a6 6 0 0 1-12 0v-2h2v2a4 4 0 0 0 8 0v-2h2z"/></svg>
          <span>${taggedList.length}</span>
        </div>` : "";

      return `
        <div class="ai-grid-wrapper ${extraClass}" style="flex-shrink:0; width:${width}; box-sizing:border-box; display:flex;">
          <div class="ai-grid-item ${extraClass}" data-id="${item.id || (item.media_url ? item.media_url.slice(-20) : '')}" 
               style="text-decoration:none; display:flex; flex-direction:column; cursor:pointer; width:100%; height:100%; background:#f1f5f9; position:relative; border:1px solid #e2e8f0; border-radius:0; box-sizing:border-box; ${itemStyle}">
              ${inner}
              ${shoppableBadge}
              <div class="ai-card-overlay"></div>
              <div class="ai-metrics">${metrics}</div>
          </div>
        </div>`;
    }

    setupInfiniteScroll(config, mediaData) {
      const sentinel = this.shadowRoot.querySelector('#ai-infinite-sentinel');
      if (!sentinel) return;
      if (this.infiniteObserver) this.infiniteObserver.disconnect();

      const c = config.postFeed || {};
      const layoutMode = c.layoutMode || c.layoutStyle || (c.carousel ? "carousel" : "grid");
      if (layoutMode !== "carousel") return;

      const isMobile = window.innerWidth <= 768;
      const initialLimit = isMobile ? (c.mobileLimit || 4) : (c.desktopLimit || 8);
      if (this.currentDisplayLimit < initialLimit) {
        this.currentDisplayLimit = initialLimit;
      }

      const track = this.shadowRoot.querySelector('.ai-fw-track');
      if (!track) return;

      this.infiniteObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          if (this.currentDisplayLimit < mediaData.length) {
            this.currentDisplayLimit += (isMobile ? 6 : 12);
            this.appendMoreItems(config, mediaData, this.currentDisplayLimit);
          } else {
            this.infiniteObserver.disconnect();
            const s = this.shadowRoot.querySelector('#ai-infinite-sentinel');
            if (s) s.style.display = 'none';
          }
        }
      }, { root: track, rootMargin: '150px', threshold: 0.1 });

      this.infiniteObserver.observe(sentinel);
    }

    appendMoreItems(config, mediaData, limit) {
      const c = config.postFeed || {};
      const layoutMode = c.layoutMode || c.layoutStyle || (c.carousel ? "carousel" : "grid");
      if (layoutMode !== "carousel") return;

      const isMobile = window.innerWidth <= 768;
      const columns = isMobile ? (Number(c.mobileColumns) || 2) : (Number(c.desktopColumns) || 4);
      const gap = Number(c.gap) >= 0 ? Number(c.gap) : 16;
      const batchSize = isMobile ? 6 : 12;
      const prevLimit = Math.max(0, limit - batchSize);
      const newItems = mediaData.slice(prevLimit, limit);

      const itemWidth = 'calc((100% - ' + ((columns - 1) * gap) + 'px) / ' + columns + ')';
      const track = this.shadowRoot.querySelector('.ai-fw-track');
      const sentinel = this.shadowRoot.querySelector('#ai-infinite-sentinel');
      if (!track) { this.render(config, mediaData); return; }
      newItems.forEach(item => {
        const wrap = document.createElement('div');
        wrap.innerHTML = this.renderMediaCard(item, c, itemWidth);
        const el = wrap.firstElementChild;
        if (el) {
          if (sentinel && sentinel.parentNode === track) {
            track.insertBefore(el, sentinel);
          } else {
            track.appendChild(el);
          }
        }
      });

      if (limit >= mediaData.length) {
        const sentinel = this.shadowRoot.querySelector('#ai-infinite-sentinel');
        if (sentinel) sentinel.style.display = 'none';
        if (this.infiniteObserver) this.infiniteObserver.disconnect();
      }
    }
  }

  // ── InstafeedStory Custom Element ──────────────────────────────────────────
  class InstafeedStory extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.config = null;
      this.mediaData = null;
    }

    connectedCallback() {
      if (cachedConfig && cachedStoryMedia) {
        this.render(cachedConfig, cachedStoryMedia);
      }
      this._handleClickBound = this._handleClickBound || this._handleClick.bind(this);
      this.shadowRoot.addEventListener("click", this._handleClickBound);
    }

    disconnectedCallback() {
      this.shadowRoot.removeEventListener("click", this._handleClickBound);
    }

    _handleClick(e) {
      const storyItem = e.target.closest(".ai-story-item");
      if (storyItem) {
        trackEvent('click');
        if (storyItem.classList.contains("ai-promo-item") || storyItem.querySelector(".ai-promo-pill")) {
          e.preventDefault();
          this.dispatchEvent(new CustomEvent("instafeed:open-modal", {
            bubbles: true,
            composed: true,
            detail: {
              id: "promo",
              source: "promo",
              media: [],
              config: this.config,
              cssUrl: this.getAttribute("css-url") || getCssUrl()
            }
          }));
          return;
        }

        const isPopup = this.config?.stories?.openPopup !== false;
        if (isPopup) {
          e.preventDefault();
          const itemId = storyItem.getAttribute("data-id");
          this.dispatchEvent(new CustomEvent("instafeed:open-modal", {
            bubbles: true,
            composed: true,
            detail: {
              id: itemId,
              source: "story",
              media: this.mediaData || cachedStoryMedia || [],
              config: this.config || cachedConfig || {},
              cssUrl: this.getAttribute("css-url") || getCssUrl()
            }
          }));
        }
      }
    }

    render(config, mediaData) {
      const isMobile   = window.innerWidth <= 768;
      const renderKey = JSON.stringify({ isMobile, c: config.stories, m: (mediaData || []).map(x => x.id || x.media_url) });
      if (this.lastRenderKey === renderKey) return;
      this.lastRenderKey = renderKey;

      this.config = config;
      this.mediaData = mediaData;

      const s         = config.stories;
      const ringColor = s.ringColor || config.postFeed?.typography?.heading?.color || "#6366f1";
      const storyItems = getMedia(mediaData, 10);
      const isActiveRing = s.activeRing === true;
      const trackId = "ai-story-track-" + Date.now();
      const cssUrl = this.getAttribute("css-url") || getCssUrl();

      let styleLink = "";
      if (cssUrl) {
        styleLink = `<link rel="stylesheet" href="${cssUrl}">`;
      }

      const sHeadingSize = s.typography?.heading?.size ? (isMobile ? Math.min(s.typography.heading.size, 18) : s.typography.heading.size) : (isMobile ? 18 : 28);
      const sSubSize     = s.typography?.subheading?.size ? (isMobile ? Math.min(s.typography.subheading.size, 12) : s.typography.subheading.size) : (isMobile ? 12 : 14);

      let html = styleLink + `<div class="ai-instafeed-root" style="font-family:inherit;width:100%;max-width:1200px;margin:0 auto;box-sizing:border-box;overflow:hidden;padding-top:${s.paddingTop ?? 24}px;padding-bottom:${s.paddingBottom ?? 24}px;">`;

      if (s.showHeader && ((s.heading && s.heading.trim()) || (s.subheading && s.subheading.trim()))) {
        html += `
          <div style="text-align:${s.alignment};margin-bottom:24px;">`;
        if (s.heading && s.heading.trim()) {
          html += `<h4 style="font-size:${sHeadingSize}px;font-weight:${s.typography?.heading?.weight || '800'};color:${s.typography?.heading?.color || '#000'};margin:0 0 8px 0;line-height:1.2;word-break:break-word;">${esc(formatDynamicAccountText(s.heading, config.instagramHandle))}</h4>`;
        }
        if (s.subheading && s.subheading.trim()) {
          html += `<p style="font-size:${sSubSize}px;font-weight:${s.typography?.subheading?.weight || '400'};color:${s.typography?.subheading?.color || '#666'};margin:0;word-break:break-word;">${esc(formatDynamicAccountText(s.subheading, config.instagramHandle))}</p>`;
        }
        html += `</div>`;
      }

      if (s.enable) {
        const isShowNav = s.showNavigation !== false;
        const storyNavBtnStyle = `outline:none!important;-webkit-appearance:none!important;appearance:none!important;color:#1e293b!important;`;
        html += `
          <div class="ai-fw-carousel-wrapper" style="position:relative;width:100%;">
            ${isShowNav ? `
              <div class="ai-fw-nav ai-fw-prev" data-track-id="${trackId}" role="button" tabindex="0" aria-label="Previous" style="${storyNavBtnStyle}width:28px;height:28px;left:0px;top:32px;transform:translateY(-50%);">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#1e293b" stroke-width="2"><path d="M12 16l-4-4 4-4"/></svg>
              </div>
            ` : ''}
            <div id="${trackId}" class="ai-fw-track" style="display:flex;width:100%;justify-content:flex-start;overflow-x:auto;scroll-behavior:smooth;scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;gap:12px;padding:8px 16px 24px;">`;

        // Prepend promo story if enabled
        if (s.promoEnable !== false) {
          html += `
            <div class="ai-story-item ai-promo-item" style="flex-shrink:0;width:64px;min-width:64px;text-align:center;cursor:pointer;overflow:visible;">
              <a href="javascript:void(0)" style="text-decoration:none;display:block;width:100%;">
                <div class="ai-story-ring-wrapper" style="width:64px;height:64px;border-radius:50%;padding:3px;border: ${isActiveRing ? 'none' : '2px solid ' + ringColor};background:white;margin:0 auto;position:relative; transform: translateZ(0); -webkit-transform: translateZ(0);">
                  ${isActiveRing ? `
                    <svg class="ai-story-ring-svg ${s.pulseRing === true ? 'ai-story-ring-pulse' : ''}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                      <circle class="ai-story-ring-circle" cx="50" cy="50" r="47.5" stroke="${ringColor}" />
                    </svg>` : ''}
                  <div class="ai-story-image-container" style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:linear-gradient(135deg, #e1306c 0%, #c13584 50%, #f77737 100%);display:flex;align-items:center;justify-content:center;position:relative;z-index:1;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </div>
                </div>
              </a>
            </div>`;
        }

        storyItems.forEach((item, i) => {
          const rawType   = (item.media_type || "").toUpperCase();
          const isVideo   = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
          const thumbUrl  = item.thumbnail_url || "";
          const posterAttr = thumbUrl ? ` poster="${esc(thumbUrl)}"` : "";
          const href      = item.permalink || "#";
          const target    = href === "#" ? "_self" : "_blank";

          let mediaTpl = "";
          if (isVideo) {
            if (s.autoplay) {
              mediaTpl = `<video src="${esc(item.media_url)}"${posterAttr} autoplay muted loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
            } else if (thumbUrl) {
              mediaTpl = `<img loading="lazy" src="${esc(thumbUrl)}" alt="story" class="${s.animateImages ? 'ai-ken-burns' : ''}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
            } else if (item.media_url) {
              mediaTpl = `<video src="${esc(item.media_url)}" muted playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
            } else {
              mediaTpl = `<div class="ai-skeleton-tile"></div>`;
            }
          } else if (item.media_url) {
            mediaTpl = `<img loading="lazy" src="${esc(item.media_url)}" alt="story" class="${s.animateImages ? 'ai-ken-burns' : ''}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
          } else {
            mediaTpl = `<div class="ai-skeleton-tile"></div>`;
          }

          const isPopup  = s.openPopup !== false;
          const finalHref   = isPopup ? "javascript:void(0)" : href;

          html += `
            <div class="ai-story-item" data-id="${item.id || (item.media_url ? item.media_url.slice(-20) : '')}" style="flex-shrink:0;width:64px;text-align:center;cursor:pointer;overflow:visible;">
              <a href="${esc(finalHref)}" target="${isPopup ? '_self' : target}" rel="noopener noreferrer" style="text-decoration:none;display:block;width:100%;">
                <div class="ai-story-ring-wrapper" style="width:64px;height:64px;border-radius:50%;padding:3px;border: ${isActiveRing ? 'none' : '2px solid ' + ringColor};background:white;margin:0 auto;position:relative; transform: translateZ(0); -webkit-transform: translateZ(0);">
                  ${isActiveRing ? `
                    <svg class="ai-story-ring-svg ${s.pulseRing === true ? 'ai-story-ring-pulse' : ''}" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                      <circle class="ai-story-ring-circle" cx="50" cy="50" r="47.5" stroke="${ringColor}" />
                    </svg>` : ''}
                  <div class="ai-story-image-container" style="width:100%;height:100%;border-radius:50%;overflow:hidden;background:#f1f5f9;position:relative;z-index:1;">${mediaTpl}</div>
                </div>
              </a>
            </div>`;
        });

        html += `</div>
            ${isShowNav ? `
              <div class="ai-fw-nav ai-fw-next" data-track-id="${trackId}" role="button" tabindex="0" aria-label="Next" style="${storyNavBtnStyle}width:28px;height:28px;right:0px;top:32px;transform:translateY(-50%);">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#1e293b" stroke-width="2"><path d="M8 16l4-4-4-4"/></svg>
              </div>
            ` : ''}
          </div>`;
      }

      const igHandle = (config.instagramHandle || "").replace("@", "").trim();
      if (igHandle && s.showFollowButton === true) {
        html += `<div style="text-align:center;margin-top:20px;margin-bottom:12px;">`
              + `<a href="https://instagram.com/${esc(igHandle)}" target="_blank" rel="noopener noreferrer" class="ai-follow-btn">`
              + `<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
              + `<span>Follow on Instagram</span>`
              + `</a></div>`;
      }

      html += `</div>`;
      this.shadowRoot.innerHTML = html;
      bindCarouselNav(this.shadowRoot);
    }
  }

  // ── InstafeedModal Custom Element ──────────────────────────────────────────
  class InstafeedModal extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.currentIndex = -1;
      this.activeMedia = [];
      this.config = null;
      this.source = 'grid';
      this._boundKeydown = this._handleKeydown.bind(this);
    }

    connectedCallback() {
      this.style.cssText = "position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483647; display: none;";
      this._handleClickBound = this._handleClickBound || this._handleClick.bind(this);
      this.shadowRoot.addEventListener("click", this._handleClickBound);
    }

    disconnectedCallback() {
      this.shadowRoot.removeEventListener("click", this._handleClickBound);
      document.removeEventListener("keydown", this._boundKeydown);
    }

    _handleClick(e) {
      const hotspotPin = e.target.closest(".ai-hotspot-pin");
      if (hotspotPin) {
        const isActive = hotspotPin.classList.contains("ai-pin-active");
        this.shadowRoot.querySelectorAll(".ai-hotspot-pin").forEach(p => p.classList.remove("ai-pin-active"));
        if (!isActive) {
          hotspotPin.classList.add("ai-pin-active");
        }
        return;
      }

      if (e.target.closest(".ai-modal-header-close") || e.target.closest(".ai-modal-float-close")) {
        this.close();
      } else if (e.target.closest(".ai-modal-promo-link-btn")) {
        this.source = 'promo';
        this.renderModal(-1);
      } else if (e.target.closest(".ai-modal-prev")) {
        this.navigate(-1);
      } else if (e.target.closest(".ai-modal-next")) {
        this.navigate(1);
      } else if (e.target.closest(".ai-modal-sub-prev")) {
        this.navigateSub(-1);
      } else if (e.target.closest(".ai-modal-sub-next")) {
        this.navigateSub(1);
      } else if (e.target.closest(".ai-modal-carousel-dot")) {
        const dot = e.target.closest(".ai-modal-carousel-dot");
        const idx = parseInt(dot.getAttribute("data-index"), 10);
        if (!isNaN(idx)) {
          this.scrollToSubIndex(idx);
        }
      } else if (e.target.closest(".ai-modal-share-btn")) {
        const item = this.activeMedia ? this.activeMedia[this.currentIndex] : null;
        const shareUrl = item ? (item.permalink || window.location.href) : window.location.href;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareUrl).then(() => {
            this.showToast("✨ Link copied to clipboard!");
          }).catch(() => {
            window.prompt("Copy post link:", shareUrl);
          });
        } else {
          window.prompt("Copy post link:", shareUrl);
        }
      } else if (e.target.closest(".ai-modal-promo-link-btn")) {
        this.open(null, "promo", [], this.config, this.cssUrl);
      } else if (e.target.id === "ai-instafeed-modal-root") {
        this.close();
      }
    }

    showToast(msg) {
      const existing = this.shadowRoot.querySelector('.ai-modal-toast');
      if (existing) existing.remove();
      const toast = document.createElement('div');
      toast.className = 'ai-modal-toast';
      toast.textContent = msg;
      const layout = this.shadowRoot.querySelector('.ai-modal-layout');
      if (layout) layout.appendChild(toast);
      setTimeout(() => toast.remove(), 2500);
    }

    _handleKeydown(e) {
      const showNav = this.config?.postFeed?.modalNavigation !== false;
      if (e.key === 'Escape') this.close();
      if (showNav) {
        if (e.key === 'ArrowRight' && (this.currentIndex < this.activeMedia.length - 1)) this.navigate(1);
        if (e.key === 'ArrowLeft'  && (this.currentIndex > 0)) this.navigate(-1);
      }
    }

    open(id, source, mediaList, config, cssUrl) {
      this.source = source;
      this.activeMedia = mediaList;
      this.config = config;
      this.cssUrl = cssUrl;

      if (source === 'promo') {
        document.removeEventListener("keydown", this._boundKeydown);
        this.renderModal(-1);
        this.style.display = "block";
        this.setAttribute("active", "");
        return;
      }

      let list = (mediaList && mediaList.length > 0) ? mediaList : (cachedGridMedia.length > 0 ? cachedGridMedia : cachedStoryMedia);
      if (!list || list.length === 0) {
        list = [{
          id: id || 'placeholder_0',
          media_type: 'IMAGE',
          media_url: PLACEHOLDERS[0],
          caption: 'Shop our latest Instagram styles!',
          like_count: 36,
          comments_count: 8,
          timestamp: new Date().toISOString()
        }];
      }
      this.activeMedia = list;

      let index = list.findIndex(m => String(m.id || (m.media_url ? m.media_url.slice(-20) : '')) === String(id));
      if (index === -1) {
        index = 0;
      }

      document.removeEventListener("keydown", this._boundKeydown);
      document.addEventListener("keydown", this._boundKeydown);

      this.renderModal(index);
      this.style.display = "block";
      this.setAttribute("active", "");
    }

    close() {
      const root = this.shadowRoot.querySelector('#ai-instafeed-modal-root');
      if (!root) return;

      // Stop video/audio immediately
      root.querySelectorAll('video').forEach(v => {
        v.pause();
        v.muted = true;
        v.src = '';
      });

      this.style.display = "none";
      this.removeAttribute("active");
      this.shadowRoot.innerHTML = '';
      document.removeEventListener('keydown', this._boundKeydown);
    }

    navigate(dir) {
      const newIndex = this.currentIndex + dir;
      if (newIndex < 0 || newIndex >= this.activeMedia.length) return;
      this.renderModal(newIndex);
    }

    navigateSub(dir) {
      const track = this.shadowRoot.querySelector('.ai-modal-carousel-track');
      if (!track) return;
      const slides = track.querySelectorAll('.ai-modal-carousel-slide');
      if (slides.length <= 1) return;

      if (this.currentSubIndex === undefined) {
        this.currentSubIndex = 0;
      }

      let newSubIndex = this.currentSubIndex + dir;
      if (newSubIndex < 0 || newSubIndex >= slides.length) return;

      const slideWidth = track.clientWidth || track.getBoundingClientRect().width;
      track.scrollTo({ left: slideWidth * newSubIndex, behavior: 'smooth' });
    }

    scrollToSubIndex(idx) {
      const track = this.shadowRoot.querySelector('.ai-modal-carousel-track');
      if (!track) return;
      const slideWidth = track.clientWidth || track.getBoundingClientRect().width;
      track.scrollTo({ left: slideWidth * idx, behavior: 'smooth' });
    }

    updateSubCarouselUI(index, totalSlides) {
      const dots = this.shadowRoot.querySelectorAll('.ai-modal-carousel-dot');
      dots.forEach((dot, idx) => {
        if (idx === index) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      const subPrev = this.shadowRoot.querySelector('.ai-modal-sub-prev');
      const subNext = this.shadowRoot.querySelector('.ai-modal-sub-next');
      if (subPrev) subPrev.style.display = index > 0 ? 'flex' : 'none';
      if (subNext) subNext.style.display = index < totalSlides - 1 ? 'flex' : 'none';
    }

    bindSubCarouselEvents() {
      const track = this.shadowRoot.querySelector('.ai-modal-carousel-track');
      if (!track) return;
      const slides = track.querySelectorAll('.ai-modal-carousel-slide');
      if (slides.length <= 1) return;

      track.addEventListener('scroll', () => {
        const slideWidth = track.clientWidth || track.getBoundingClientRect().width;
        if (slideWidth <= 0) return;
        const newIndex = Math.round(track.scrollLeft / slideWidth);
        if (newIndex !== this.currentSubIndex) {
          this.currentSubIndex = newIndex;
        this.updateSubCarouselUI(newIndex, slides.length);
        }
      }, { passive: true });
    }

    renderModal(index) {
      this.currentIndex = index;
      this.currentSubIndex = 0; // Reset sub-carousel index

      if (this.source === 'promo') {
        const s = (this.config && this.config.stories) || {};
        const promoLabelText = s.promoLabel || "Get 10% Off";
        const igHandle = (this.config && this.config.instagramHandle) ? this.config.instagramHandle.replace("@", "").trim() : "gpmbazaar";
        const defaultPromoText = "Take a screenshot of a product you wish to buy and tag @gpmbazaar and we will send you a 10% Off Discount Coupon Code!";
        const rawPromoDesc = (s.promoDesc && !s.promoDesc.includes("WELCOME10")) ? s.promoDesc : defaultPromoText;
        const handleTag = igHandle ? `@${esc(igHandle)}` : "@gpmbazaar";
        const promoDescHtml = esc(rawPromoDesc).replace(/@gpmbazaar|@account/gi, `<span style="color: #e1306c; font-weight: 700;">${handleTag}</span>`);

        let styleLink = "";
        if (this.cssUrl) {
          styleLink = `<link rel="stylesheet" href="${this.cssUrl}">`;
        }

        this.shadowRoot.innerHTML =
          styleLink +
          `<style>
            @media (max-width: 520px) {
              .ai-modal-layout-promo {
                flex-direction: column !important;
                max-height: 85vh !important;
                max-width: 90% !important;
              }
            }
          </style>
          <div id="ai-instafeed-modal-root" style="position: fixed; inset: 0; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); z-index: 2147483647; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; animation: aiFadeIn 0.3s ease-out;">
            <div class="ai-modal-layout ai-modal-layout-promo" style="max-width: 600px; display: flex; flex-direction: row; overflow: hidden; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); background: white;">
              <!-- Left side: Gradient visual card -->
              <div style="flex: 1; background: linear-gradient(135deg, #e1306c 0%, #c13584 50%, #f77737 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; padding: 32px; text-align: center; min-height: 200px; box-sizing: border-box;">
                <div style="background: rgba(255, 255, 255, 0.2); border-radius: 50%; padding: 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: center;">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                </div>
                <h3 style="font-size: 20px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: 0.5px; line-height: 1.2;">SPECIAL OFFER</h3>
                <p style="font-size: 12px; opacity: 0.9; margin: 0; font-weight: 600;">Exclusive Offer</p>
              </div>
              <!-- Right side: offer details panel -->
              <div style="flex: 1.2; display: flex; flex-direction: column; background: white; padding: 32px; position: relative; justify-content: center; box-sizing: border-box;">
                <button class="ai-modal-header-close" aria-label="Close" style="position: absolute; top: 16px; right: 16px; background: #f1f5f9; border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-weight: bold; z-index: 10; display: flex; align-items: center; justify-content: center;">✕</button>
                <h4 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.2;">${esc(promoLabelText)}</h4>
                <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 24px 0; font-weight: 500;">
                  ${promoDescHtml}
                </p>
                <a href="https://instagram.com/${esc(igHandle)}" target="_blank" rel="noopener noreferrer" class="ai-modal-header-close" style="width: 100%; display: flex; align-items: center; justify-content: center; padding: 10px; background: #0f172a; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer; text-decoration: none; box-sizing: border-box;">Open Instagram</a>
              </div>
            </div>
          </div>`;
        return;
      }

      const item = this.activeMedia[index];
      if (!item) return;

      const showNav    = this.config.postFeed?.modalNavigation !== false;
      const hasPrev    = showNav && index > 0;
      const hasNext    = showNav && index < this.activeMedia.length - 1;

      const rawType     = (item.media_type || "").toUpperCase();
      const isVideo     = rawType === 'VIDEO' || rawType === 'REEL' || (item.media_url && (item.media_url.toLowerCase().includes('.mp4') || item.media_url.toLowerCase().includes('.mov')));
      const enableSound = this.config.postFeed?.modalSound;
      const videoAttrs  = enableSound ? 'controls controlsList="nodownload"' : 'muted';

      // Build media HTML with support for multi-image children carousels
      const subChildren = item.children?.data || [];
      let mediaHtml = '';
      if (subChildren.length > 0) {
        const slidesHtml = subChildren.map((child, cIdx) => {
          const childType = (child.media_type || "").toUpperCase();
          const isChildVideo = childType === 'VIDEO' || childType === 'REEL' || (child.media_url && (child.media_url.toLowerCase().includes('.mp4') || child.media_url.toLowerCase().includes('.mov')));
          const childVideoAttrs = enableSound ? 'controls controlsList="nodownload"' : 'muted';
          const childSrc = child.media_url;
          const childPosterAttr = child.thumbnail_url ? ` poster="${esc(child.thumbnail_url)}"` : '';
          return `<div class="ai-modal-carousel-slide">` +
            (isChildVideo
              ? `<video class="ai-modal-carousel-video" src="${childSrc}"${childPosterAttr} autoplay loop ${childVideoAttrs} playsinline preload="metadata" style="width:100%;height:100%;object-fit:contain;display:block;"></video>`
              : `<img src="${childSrc}" alt="Instagram carousel item" style="width:100%;height:100%;object-fit:contain;display:block;">`) +
            `</div>`;
        }).join('');

        const dotsHtml = `<div class="ai-modal-carousel-dots">` +
          subChildren.map((_, cIdx) => `<span class="ai-modal-carousel-dot${cIdx === 0 ? ' active' : ''}" data-index="${cIdx}"></span>`).join('') +
          `</div>`;

        const subPrevBtn = `<button class="ai-modal-sub-nav ai-modal-sub-prev" aria-label="Previous image" style="display:none;">` +
          `<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="#262626" stroke-width="2.5"><path d="M13 16l-5-5 5-5"/></svg>` +
          `</button>`;

        const subNextBtn = `<button class="ai-modal-sub-nav ai-modal-sub-next" aria-label="Next image">` +
          `<svg width="12" height="12" viewBox="0 0 20 20" fill="none" stroke="#262626" stroke-width="2.5"><path d="M7 16l5-5-5-5"/></svg>` +
          `</button>`;

        mediaHtml = `<div class="ai-modal-carousel-container">` +
          `<div class="ai-modal-carousel-track">` + slidesHtml + `</div>` +
          (subChildren.length > 1 ? subPrevBtn + subNextBtn + dotsHtml : '') +
          `</div>`;
      } else {
        const modalPosterAttr = item.thumbnail_url ? ' poster="' + esc(item.thumbnail_url) + '"' : '';
        mediaHtml = isVideo
          ? '<video id="ai-modal-video" src="' + item.media_url + '"' + modalPosterAttr + ' autoplay loop ' + videoAttrs + ' playsinline preload="metadata" style="width:100%;height:100%;object-fit:contain;display:block;"></video>'
          : '<img src="' + item.media_url + '" alt="Instagram post" style="width:100%;height:100%;object-fit:contain;display:block;">';
      }

      const handle   = this.config.instagramHandle || 'instagram';
      const caption  = item.caption ? item.caption.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
      const date     = item.timestamp ? new Date(item.timestamp).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}) : 'Recently';
      const link     = item.permalink || '#';
      const likes    = item.like_count || 0;

      const isPromoEnabled = this.config && this.config.stories && this.config.stories.promoEnable === true;
      const promoLabel = (this.config && this.config.stories && this.config.stories.promoLabel) || 'Get 10% Off';

      const showBranding = (this.source === 'story') 
        ? !this.config.stories.removeWatermark 
        : !this.config.postFeed.removeWatermark;
        
      const logoContent = this.config.logoUrl 
        ? '<img src="' + this.config.logoUrl + '" style="height:16px !important;width:auto !important;max-width:none !important;max-height:16px !important;vertical-align:middle !important;display:inline-block !important;margin-left:4px !important;" alt="BOOST STAR Experts" />'
        : 'BOOST STAR Experts';
      const watermarkHtml = showBranding ? '<div style="text-align:center;padding:12px 0 0;font-size:11px;color:#9ca3af;"><a href="https://apps.shopify.com/ai-instafeed" target="_blank" rel="noopener noreferrer" style="display:inline-block;vertical-align:middle;">' + logoContent + '</a></div>' : '';

      const prevBtn = hasPrev
        ? '<button class="ai-modal-nav-btn ai-modal-prev" aria-label="Previous post">' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M13 16l-5-5 5-5"/></svg>' +
          '</button>'
        : '';

      const nextBtn = hasNext
        ? '<button class="ai-modal-nav-btn ai-modal-next" aria-label="Next post">' +
            '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 16l5-5-5-5"/></svg>' +
          '</button>'
        : '';

      const counterBadge = showNav
        ? '<div class="ai-modal-counter">' + (index + 1) + ' / ' + this.activeMedia.length + '</div>'
        : '';

      const postTags = (this.config && this.config.taggedProducts && (this.config.taggedProducts[item.id] || this.config.taggedProducts[item.media_url])) || [];
      let hotspotPinsHtml = '';
      if (postTags.length > 0) {
        hotspotPinsHtml = postTags.map((pin) => `
          <div class="ai-hotspot-pin" style="position:absolute;left:${pin.x}%;top:${pin.y}%;transform:translate(-50%,-50%);z-index:30;" data-pin-id="${esc(pin.id)}">
            <div class="ai-pin-pulse"></div>
            <div class="ai-pin-dot">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <div class="ai-pin-tooltip">
              ${pin.image ? `<img src="${esc(pin.image)}" class="ai-pin-tooltip-img" alt="${esc(pin.title)}" />` : `<div class="ai-pin-tooltip-img ai-pin-img-placeholder"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>`}
              <div class="ai-pin-tooltip-info">
                <div class="ai-pin-tooltip-title">${esc(pin.title)}</div>
                <div class="ai-pin-tooltip-price">$${esc(pin.price)}</div>
                <button type="button" class="ai-pin-add-cart-btn" data-variant-id="${esc(pin.variantId)}" data-product-title="${esc(pin.title)}">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                  <span>Add to Cart</span>
                </button>
              </div>
            </div>
          </div>
        `).join('');
      }

      let taggedProductsSectionHtml = '';
      if (postTags.length > 0) {
        taggedProductsSectionHtml = `
          <div class="ai-tagged-products-wrap">
            <div class="ai-tagged-products-header">
              <div class="ai-tagged-products-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                <span>Shop The Look</span>
              </div>
              <span class="ai-tagged-count-pill">${postTags.length} ${postTags.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div class="ai-tagged-products-list">
              ${postTags.map((pin) => `
                <div class="ai-tagged-product-item">
                  <div class="ai-tagged-product-left">
                    ${pin.image ? `<img src="${esc(pin.image)}" class="ai-tagged-product-img" alt="${esc(pin.title)}" />` : `<div class="ai-tagged-product-img ai-tagged-img-placeholder"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>`}
                    <div class="ai-tagged-product-details">
                      <div class="ai-tagged-product-name" title="${esc(pin.title)}">${esc(pin.title)}</div>
                      <div class="ai-tagged-product-price">$${esc(pin.price)}</div>
                    </div>
                  </div>
                  <button type="button" class="ai-product-add-cart-btn" data-variant-id="${esc(pin.variantId)}" data-product-title="${esc(pin.title)}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    <span>Add to Cart</span>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Check if root and media pane already exist to avoid re-triggering entrance animations
      const existingRoot = this.shadowRoot.querySelector('#ai-instafeed-modal-root');
      const existingMediaPane = this.shadowRoot.querySelector('.ai-modal-media-pane');
      if (existingRoot && existingMediaPane) {
        // Stop any existing video before updating
        existingRoot.querySelectorAll('video').forEach(v => {
          v.pause();
          v.src = '';
        });

        // 1. Update Media Pane
        const mediaPane = this.shadowRoot.querySelector('.ai-modal-media-pane');
        if (mediaPane) {
          mediaPane.innerHTML = mediaHtml + hotspotPinsHtml + prevBtn + nextBtn + counterBadge;
        }

        // 2. Update Header Info
        const handleEl = this.shadowRoot.querySelector('.ai-modal-handle');
        if (handleEl) handleEl.textContent = '@' + handle;

        // 3. Update Body Info
        const captionHandleEl = this.shadowRoot.querySelector('.ai-modal-caption-handle');
        if (captionHandleEl) captionHandleEl.textContent = '@' + handle;

        const captionTextEl = this.shadowRoot.querySelector('.ai-modal-caption-text');
        if (captionTextEl) captionTextEl.innerHTML = caption;

        let taggedWrap = this.shadowRoot.querySelector('.ai-tagged-products-wrap');
        if (taggedWrap) taggedWrap.remove();
        if (taggedProductsSectionHtml) {
          const bodyEl = this.shadowRoot.querySelector('.ai-modal-body');
          if (bodyEl) bodyEl.insertAdjacentHTML('afterbegin', taggedProductsSectionHtml);
        }

        // 4. Update Footer Info
        const likesEl = this.shadowRoot.querySelector('.ai-modal-likes-count');
        if (likesEl) likesEl.textContent = likes;

        const dateEl = this.shadowRoot.querySelector('.ai-modal-date');
        if (dateEl) dateEl.textContent = date;

        const igBtn = this.shadowRoot.querySelector('.ai-modal-ig-btn');
        if (igBtn) igBtn.setAttribute('href', link);

        const watermarkWrap = this.shadowRoot.querySelector('.ai-modal-watermark-wrap');
        if (watermarkWrap) watermarkWrap.innerHTML = watermarkHtml;

      } else {
        // Render whole modal structure
        let styleLink = "";
        if (this.cssUrl) {
          styleLink = `<link rel="stylesheet" href="${this.cssUrl}">`;
        }

        const embeddedModalStyles = `<style>
          #ai-instafeed-modal-root {
            position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;
            width: 100vw !important; height: 100vh !important; height: 100dvh !important; background: rgba(0, 0, 0, 0.85) !important;
            backdrop-filter: blur(12px) !important; -webkit-backdrop-filter: blur(12px) !important;
            z-index: 2147483647 !important; display: flex !important; align-items: center !important; justify-content: center !important;
            padding: 20px !important; box-sizing: border-box !important; margin: 0 !important;
          }
          .ai-modal-layout {
            display: flex !important; flex-direction: row !important; width: 100% !important; max-width: 960px !important;
            max-height: 85vh !important; height: 600px !important; background: #ffffff !important; border-radius: 16px !important;
            overflow: hidden !important; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5) !important; position: relative !important;
          }
          .ai-modal-media-pane {
            flex: 1.3 !important; background: #000000 !important; display: flex !important; align-items: center !important;
            justify-content: center !important; position: relative !important; overflow: hidden !important;
          }
          .ai-modal-media-pane img, .ai-modal-media-pane video {
            max-width: 100% !important; max-height: 100% !important; width: 100% !important; height: 100% !important; object-fit: contain !important;
          }
          .ai-modal-info-pane {
            flex: 1 !important; display: flex !important; flex-direction: column !important; background: #ffffff !important;
            position: relative !important; overflow: hidden !important; min-height: 0 !important;
          }
          .ai-modal-header {
            display: flex !important; align-items: center !important; gap: 12px !important; padding: 16px 20px !important; border-bottom: 1px solid #f1f5f9 !important; flex-shrink: 0 !important;
          }
          .ai-modal-header-close {
            background: #f1f5f9 !important; border: none !important; width: 32px !important; height: 32px !important; border-radius: 50% !important;
            cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; margin-left: auto !important; font-size: 16px !important; font-weight: bold !important; color: #64748b !important; flex-shrink: 0 !important;
          }
          .ai-modal-body {
            flex: 1 !important; padding: 20px !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; overscroll-behavior: contain !important;
          }
          .ai-modal-caption { font-size: 14px !important; line-height: 1.5 !important; color: #334155 !important; margin: 0 !important; }
          .ai-modal-caption-handle { font-weight: 700 !important; color: #0f172a !important; margin-right: 6px !important; }
          .ai-modal-footer { padding: 16px 20px !important; border-top: 1px solid #f1f5f9 !important; background: #fafafa !important; flex-shrink: 0 !important; }
          .ai-modal-actions { display: flex !important; align-items: center !important; gap: 16px !important; margin-bottom: 12px !important; }
          .ai-modal-promo-link-btn {
            display: flex !important; align-items: center !important; justify-content: center !important; gap: 8px !important; width: 100% !important;
            padding: 10px 16px !important; background: linear-gradient(135deg, #e1306c 0%, #c13584 50%, #f77737 100%) !important; color: white !important;
            border: none !important; border-radius: 8px !important; font-size: 13px !important; font-weight: 700 !important; cursor: pointer !important; text-decoration: none !important; box-shadow: 0 4px 12px rgba(225, 48, 108, 0.3) !important; box-sizing: border-box !important;
          }
          @media (max-width: 768px) {
            #ai-instafeed-modal-root { padding: 0 !important; align-items: flex-end !important; }
            .ai-modal-layout { flex-direction: column !important; width: 100% !important; max-width: 100% !important; height: 92vh !important; height: 92dvh !important; max-height: 92vh !important; max-height: 92dvh !important; border-radius: 20px 20px 0 0 !important; }
            .ai-modal-media-pane { flex: none !important; width: 100% !important; height: 38vh !important; max-height: 38vh !important; min-height: 200px !important; }
            .ai-modal-info-pane { flex: 1 !important; min-height: 0 !important; max-width: 100% !important; }
            .ai-modal-header { padding: 12px 16px !important; }
            .ai-modal-body { padding: 14px 16px !important; }
            .ai-modal-footer { padding: 12px 16px !important; }
            .ai-modal-actions { margin-bottom: 8px !important; }
            .ai-modal-promo-link-btn { padding: 9px 14px !important; font-size: 12.5px !important; }
          }
          @media (max-width: 480px) {
            .ai-modal-layout { height: 94vh !important; height: 94dvh !important; max-height: 94vh !important; max-height: 94dvh !important; border-radius: 16px 16px 0 0 !important; }
            .ai-modal-media-pane { height: 35vh !important; max-height: 35vh !important; min-height: 180px !important; }
          }
        </style>`;

        this.shadowRoot.innerHTML =
          styleLink +
          embeddedModalStyles +
          '<div id="ai-instafeed-modal-root">' +
            '<div class="ai-modal-layout">' +
              '<div class="ai-modal-media-pane">' +
                mediaHtml +
                hotspotPinsHtml +
                prevBtn +
                nextBtn +
                counterBadge +
              '</div>' +
              '<div class="ai-modal-info-pane">' +
                '<div class="ai-modal-header">' +
                  '<div class="ai-modal-avatar">' +
                    '<svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>' +
                  '</div>' +
                  '<div class="ai-modal-handle-wrap">' +
                    '<div class="ai-modal-handle">@' + handle + '</div>' +
                    '<div class="ai-modal-sublabel">Instagram Feed</div>' +
                  '</div>' +
                  '<button class="ai-modal-header-close" aria-label="Close">' +
                    '<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#64748b" stroke-width="2"><path d="M15 5L5 15M5 5l10 10"/></svg>' +
                  '</button>' +
                '</div>' +
                '<div class="ai-modal-body">' +
                  taggedProductsSectionHtml +
                  '<p class="ai-modal-caption">' +
                    '<strong class="ai-modal-caption-handle">@' + handle + '</strong>' +
                    '<span class="ai-modal-caption-text">' + caption + '</span>' +
                  '</p>' +
                '</div>' +
                '<div class="ai-modal-footer">' +
                  '<div class="ai-modal-actions">' +
                    '<div class="ai-modal-actions-left">' +
                      '<svg class="ai-action-icon" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' +
                      '<svg class="ai-action-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>' +
                      '<button type="button" class="ai-modal-share-btn" title="Share Post">' +
                        '<svg class="ai-action-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>' +
                      '</button>' +
                    '</div>' +
                    '<div class="ai-modal-actions-right">' +
                      '<svg class="ai-action-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>' +
                    '</div>' +
                  '</div>' +
                  '<div class="ai-modal-likes-line">' +
                    '<span class="ai-modal-likes-count">' + likes + '</span> likes' +
                  '</div>' +
                  '<div class="ai-modal-date">' + date + '</div>' +
                  '<div style="margin-top:12px;">' +
                    '<button type="button" class="ai-modal-promo-link-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg, #e1306c 0%, #f77737 100%); color:white; border:none; padding:10px 16px; border-radius:8px; font-weight:700; font-size:13px; cursor:pointer; box-sizing:border-box;">' +
                      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                        '<polyline points="20 12 20 22 4 22 4 12"></polyline>' +
                        '<rect x="2" y="7" width="20" height="5"></rect>' +
                        '<line x1="12" y1="22" x2="12" y2="7"></line>' +
                        '<path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>' +
                        '<path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>' +
                      '</svg>' +
                      (promoLabel || 'Get 10% Off') +
                    '</button>' +
                  '</div>' +
                  '<div class="ai-modal-watermark-wrap">' + watermarkHtml + '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
      }
      this.bindSubCarouselEvents();
      this.bindAddToCartEvents();
    }

    bindAddToCartEvents() {
      if (this.hasBoundCartEvents) return;
      this.hasBoundCartEvents = true;

      this.shadowRoot.addEventListener('click', async (e) => {
        const addBtn = e.target.closest('.ai-pin-add-cart-btn, .ai-product-add-cart-btn');
        if (!addBtn) return;

        e.preventDefault();
        e.stopPropagation();

        trackEvent('click');

        const variantId = addBtn.getAttribute('data-variant-id');
        const productTitle = addBtn.getAttribute('data-product-title') || 'Product';
        if (!variantId) return;

        const originalText = addBtn.textContent;
        addBtn.textContent = 'Adding...';
        addBtn.disabled = true;

        try {
          const rootPath = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
          const res = await fetch(rootPath + 'cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ id: variantId, quantity: 1 }] })
          });
          if (res.ok) {
            addBtn.textContent = '✓ Added!';
            addBtn.style.background = '#10b981';
            setTimeout(() => {
              addBtn.textContent = originalText;
              addBtn.disabled = false;
              addBtn.style.background = '';
            }, 2000);
            document.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true }));
            document.dispatchEvent(new CustomEvent('cart:refresh', { bubbles: true }));
          } else {
            throw new Error('Add to cart failed');
          }
        } catch (err) {
          addBtn.textContent = '✓ Added!';
          setTimeout(() => {
            addBtn.textContent = originalText;
            addBtn.disabled = false;
          }, 1500);
        }
      });
    }
  }

  if (!customElements.get("instafeed-grid")) {
    customElements.define("instafeed-grid", InstafeedGrid);
  }
  if (!customElements.get("instafeed-story")) {
    customElements.define("instafeed-story", InstafeedStory);
  }
  if (!customElements.get("instafeed-modal")) {
    customElements.define("instafeed-modal", InstafeedModal);
  }

  // ── Global event listener for modal opening ────────────────────────────────
  document.addEventListener("instafeed:open-modal", (e) => {
    let modalEl = document.querySelector("instafeed-modal");
    if (!modalEl) {
      modalEl = document.createElement("instafeed-modal");
      document.body.appendChild(modalEl);
    }
    const gridEl = document.querySelector("instafeed-grid");
    const storyEl = document.querySelector("instafeed-story");
    const logoUrl = (gridEl && gridEl.getAttribute("data-logo-url")) || (storyEl && storyEl.getAttribute("data-logo-url")) || "";
    const config = (e.detail && e.detail.config) || cachedConfig || {};
    config.logoUrl = logoUrl;

    const cssUrl = (e.detail && e.detail.cssUrl) || (gridEl && gridEl.getAttribute("css-url")) || (storyEl && storyEl.getAttribute("css-url")) || getCssUrl();

    modalEl.open(e.detail ? e.detail.id : null, e.detail ? e.detail.source : 'grid', (e.detail ? e.detail.media : null) || cachedGridMedia || cachedStoryMedia, config, cssUrl);
  });

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  async function init() {
    let loadedFromPayload = false;

    // 1. Check if initial payload was pre-rendered by Liquid block (Zero-Network)
    const initialScript = document.querySelector(".ai-instafeed-initial-data");
    if (initialScript) {
      try {
        const initial = JSON.parse(initialScript.textContent);
        if (initial && initial.config) {
          applyDataAndRender(initial.config, initial.instaData);
          loadedFromPayload = true;
        }
      } catch (e) {}
    }

    // 2. Instant client-side render from Storage Cache (<10ms)
    if (!loadedFromPayload) {
      const cached = getStoredCache();
      if (cached && cached.config) {
        applyDataAndRender(cached.config, cached.instaData);
        loadedFromPayload = true;
      }
    }

    // 3. If no pre-rendered payload and no valid cache, fetch from proxy asynchronously
    if (!loadedFromPayload) {
      await loadAndRender();
    } else {
      // Background revalidation if running on cache
      setTimeout(() => {
        loadAndRender(true);
      }, 1000);
    }

    // Re-bind on theme editor events
    document.addEventListener("shopify:section:load", () => {
      loadAndRender();
    });

    // Polling restricted to Shopify Theme Editor (designMode) for live preview updates
    if (window.Shopify && window.Shopify.designMode) {
      setInterval(async () => {
        await loadAndRender();
      }, POLL_INTERVAL);
    }

    let lastIsMobile = window.innerWidth <= 768;
    window.addEventListener("resize", () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile !== lastIsMobile) {
        lastIsMobile = isMobile;
        document.querySelectorAll("instafeed-grid").forEach(grid => {
          if (grid.config && grid.mediaData) {
            grid.render(grid.config, grid.mediaData, grid.instaData);
          }
        });
        document.querySelectorAll("instafeed-story").forEach(story => {
          if (story.config && story.mediaData) {
            story.render(story.config, story.mediaData);
          }
        });
      }
    });
  }

  function applyDataAndRender(config, instaData) {
    const grids = document.querySelectorAll("instafeed-grid");
    const stories = document.querySelectorAll("instafeed-story");

    if (!config) return;

    // Save to storage cache for instant subsequent loads
    setStoredCache(config, instaData);

    let mediaData = instaData?.media?.data || [];
    if (mediaData.length === 0 || !mediaData.some(i => i && (i.media_url || i.thumbnail_url))) {
      mediaData = SAMPLE_MEDIA;
    }
    
    if (config.postFeed?.hiddenPostIds?.length > 0) {
      mediaData = mediaData.filter(item => !config.postFeed.hiddenPostIds.includes(item.id || item.media_url));
    }

    let gridMedia = mediaData;
    let storyMedia = mediaData;

    // Filter gridMedia by grid mediaTypeFilter
    const gridFilter = config.postFeed?.mediaTypeFilter || "all";
    if (gridFilter === "images") {
      gridMedia = gridMedia.filter(item => {
        const rawType = (item.media_type || "").toUpperCase();
        const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
        return !isVideo;
      });
    } else if (gridFilter === "videos") {
      gridMedia = gridMedia.filter(item => {
        const rawType = (item.media_type || "").toUpperCase();
        const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
        return isVideo;
      });
    }
    if (config.postFeed?.sortBy === "engaging") {
      const getEngagement = (item) => (item.like_count || 0) + (item.comments_count || 0);
      gridMedia = [...gridMedia].sort((a, b) => getEngagement(b) - getEngagement(a));
    }

    // Filter storyMedia by story mediaTypeFilter
    const storyFilter = config.stories?.mediaTypeFilter || "all";
    if (storyFilter === "images") {
      storyMedia = storyMedia.filter(item => {
        const rawType = (item.media_type || "").toUpperCase();
        const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
        return !isVideo;
      });
    } else if (storyFilter === "videos") {
      storyMedia = storyMedia.filter(item => {
        const rawType = (item.media_type || "").toUpperCase();
        const isVideo = rawType === "VIDEO" || rawType === "REEL" || (item.media_url && item.media_url.toLowerCase().includes(".mp4"));
        return isVideo;
      });
    }
    if (config.stories?.sortBy === "engaging") {
      const getEngagement = (item) => (item.like_count || 0) + (item.comments_count || 0);
      storyMedia = [...storyMedia].sort((a, b) => getEngagement(b) - getEngagement(a));
    }

    cachedConfig = config;
    cachedGridMedia = gridMedia;
    cachedStoryMedia = storyMedia;
    cachedInstaData = instaData;

    // Update active components
    grids.forEach(grid => grid.render(config, gridMedia, instaData));
    stories.forEach(story => story.render(config, storyMedia, instaData));

    // Setup viewport impression tracking
    setTimeout(setupViewIntersectionObserver, 300);
  }

  async function loadAndRender(silent = false) {
    try {
      const res = await fetch(PROXY_URL, {
        credentials: "same-origin",
      });

      if (!res.ok) {
        throw new Error("Proxy returned " + res.status);
      }

      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const { config, instaData } = json;
      applyDataAndRender(config, instaData);
      
    } catch (err) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
