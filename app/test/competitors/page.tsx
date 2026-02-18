"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Swords,
  Heart,
  Palette,
  ChevronDown,
  ChevronRight,
  Play,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"

type Category = "all" | "daygame" | "lifestyle" | "design"

interface ScreenshotGroup {
  label: string
  files: string[]
  /** URL for this specific page */
  pageUrl?: string
}

interface FeatureLink {
  label: string
  url: string
  /** What to look for when visiting */
  lookFor?: string
}

interface Site {
  id: string
  name: string
  url: string
  category: "daygame" | "lifestyle" | "design"
  figure: string
  audience: string
  status: string
  notes: string
  designNotes: string
  recommendation: string
  screenshots: ScreenshotGroup[]
  /** Links to specific animations, features, pages worth checking */
  featureLinks?: FeatureLink[]
  /** YouTube or video embeds */
  videos?: { label: string; embedUrl: string }[]
}

const SITES: Site[] = [
  // ══════════════════════════════════════════
  // DAYGAME COMPETITORS
  // ══════════════════════════════════════════
  {
    id: "toddv",
    name: "Todd V Dating",
    url: "https://toddvdating.com",
    category: "daygame",
    figure: "Todd Valentine (ex-RSD)",
    audience: "~300K YT subs, 38M+ views",
    status: "Active, growing",
    notes:
      "Broadest mainstream reach in daygame. 'The System' is the most-cited product. 18+ years coaching. Courses: The System, Daygame by Todd, Verbal Game Academy, Online Dating Academy. Bootcamps across LA/Miami/Vegas/NYC/London/Prague.",
    designNotes:
      "Dark theme, dropdown nav, city-based bootcamp grid. SureCart for e-commerce. Free 'Secret Vault' lead magnet. Functional, conversion-focused — not visually distinctive.",
    recommendation:
      "Study his funnel structure (free vault → email → upsell). His 'system-based' positioning is the closest competitor to what we're building.",
    screenshots: [
      { label: "Homepage (blocked — site returns 403 to automated browsers)", files: ["toddv.png"] },
    ],
    featureLinks: [
      { label: "Homepage", url: "https://toddvdating.com", lookFor: "Dark theme, bootcamp grid, lead magnet popup" },
      { label: "The System (flagship course)", url: "https://toddvdating.com/the-system/", lookFor: "Course sales page, pricing, testimonials" },
      { label: "Bootcamps", url: "https://toddvdating.com/bootcamp/", lookFor: "City selector grid, pricing tiers" },
      { label: "YouTube", url: "https://www.youtube.com/@ToddVDating", lookFor: "Content strategy, thumbnail style" },
    ],
    videos: [
      { label: "Todd V — channel overview", embedUrl: "https://www.youtube.com/embed/9Z0m_KQbHKg" },
    ],
  },
  {
    id: "daygame-com",
    name: "Daygame.com",
    url: "https://www.daygame.com",
    category: "daygame",
    figure: "Andy Yosha & Yad",
    audience: "N/A (site offline)",
    status: "Dormant / offline",
    notes:
      "Historically THE most influential brand in daygame. Codified the London Daygame Model (stop → open → stack → hook → attract → qualify → close). Founded 2008 in London. 'Daygame Blueprint' remains legendary.",
    designNotes:
      "Site currently offline. Was a standard coaching site at peak. No screenshots possible.",
    recommendation:
      "The LDM framework they invented is essentially what we teach. Their decline = market opportunity.",
    screenshots: [
      { label: "Site offline — placeholder", files: ["daygame-com.png"] },
    ],
    featureLinks: [
      { label: "Web Archive snapshot (2016)", url: "https://web.archive.org/web/2016/https://www.daygame.com/", lookFor: "Original site layout, course offerings" },
      { label: "Daygame Blueprint on Amazon", url: "https://www.amazon.com/s?k=daygame+blueprint", lookFor: "Product reviews, community reception" },
    ],
  },
  {
    id: "torero",
    name: "Tom Torero",
    url: "https://tomtorero.mykajabi.com",
    category: "daygame",
    figure: "Tom Torero (deceased 2021)",
    audience: "YT deleted. 100+ podcast eps, books on Amazon",
    status: "Post-mortem archive",
    notes:
      "Most culturally influential daygame figure of the 2010s. Prolific: weekly podcast, books, videos, courses. Content still widely shared. Product vault on Kajabi was accessible but appears down now.",
    designNotes:
      "WordPress archive + Kajabi storefront. Post-mortem maintenance mode. Kajabi page now 404s.",
    recommendation:
      "His audience is orphaned — men who followed him have no 'home'. Our app could serve that community.",
    screenshots: [
      { label: "Kajabi vault (now 404)", files: ["torero.png"] },
    ],
    featureLinks: [
      { label: "WordPress archive", url: "https://tomtorerodotcom.wordpress.com/", lookFor: "Blog posts, writing style, topics covered" },
      { label: "Books on Amazon", url: "https://www.amazon.com/s?k=tom+torero", lookFor: "Black Sheep Bandit series, reviews" },
      { label: "Web Archive (peak era)", url: "https://web.archive.org/web/2019/https://tomtorero.com/", lookFor: "Course lineup, pricing, branding" },
    ],
    videos: [
      { label: "Tom Torero — archive infield", embedUrl: "https://www.youtube.com/embed/u5HvEMTFi_k" },
    ],
  },
  {
    id: "krauser",
    name: "Nick Krauser",
    url: "https://krauserpua.com",
    category: "daygame",
    figure: "Nick Krauser",
    audience: "~5-8K YT, ~800 email subs. Niche bestseller books.",
    status: "Semi-retired (late 2023)",
    notes:
      "Intellectual/theoretical architect of advanced daygame. 'Daygame Mastery' is THE most-cited reference textbook. Premium: £5-7K for 5-day coaching. Influence far exceeds follower count.",
    designNotes:
      "Old-school WordPress blog. Warm earthy tones, serif fonts. Text-heavy, no flashy CTAs. Cloudflare-protected (blocks automated screenshots).",
    recommendation:
      "His intellectual depth is what we should match with our AI analysis. Content > design in this niche.",
    screenshots: [
      { label: "Homepage (Cloudflare-blocked)", files: ["krauser.png"] },
    ],
    featureLinks: [
      { label: "Blog (main content)", url: "https://krauserpua.com", lookFor: "Earthy WordPress blog, serif fonts, text-heavy posts" },
      { label: "Daygame Mastery (Amazon)", url: "https://www.amazon.com/Daygame-Mastery-Nick-Krauser/dp/1527203484", lookFor: "Reviews, positioning" },
      { label: "Daygame Infinite (Amazon)", url: "https://www.amazon.com/Daygame-Infinite-Nick-Krauser/dp/1986532194", lookFor: "Advanced textbook, review quality" },
      { label: "YouTube", url: "https://www.youtube.com/@krauserpua", lookFor: "Small but dedicated audience, infield breakdowns" },
    ],
  },
  {
    id: "tnl",
    name: "The Natural Lifestyles",
    url: "https://thenaturallifestyles.com",
    category: "daygame",
    figure: "James Marshall",
    audience: "~50-150K YT est.",
    status: "Active but declining",
    notes:
      "Dominant 2013-2019, charged $15K/week. 'Natural' behavior over scripted frameworks. Euro Tours. Now declining: coaches departed, low enrollment, lawsuits.",
    designNotes:
      "Modern and professional. Dark theme, blues/oranges, card-based layouts, Vimeo embeds, team bios. One of the better-designed competitor sites. Mobile-optimized.",
    recommendation:
      "Best-looking competitor site — study card layouts and color palette. Their decline = cautionary tale about in-person dependency.",
    screenshots: [
      { label: "Homepage", files: ["tnl.png", "tnl-1.png", "tnl-2.png", "tnl-3.png", "tnl-4.png", "tnl-5.png"], pageUrl: "https://thenaturallifestyles.com" },
      { label: "Online Academy", files: ["tnl-academy.png", "tnl-academy-1.png", "tnl-academy-2.png"], pageUrl: "https://thenaturallifestyles.com/online-academy/" },
      { label: "Live Workshops", files: ["tnl-workshops.png", "tnl-workshops-1.png", "tnl-workshops-2.png"], pageUrl: "https://thenaturallifestyles.com/live-workshops/" },
      { label: "Team", files: ["tnl-team.png", "tnl-team-1.png", "tnl-team-2.png"], pageUrl: "https://thenaturallifestyles.com/team/" },
    ],
    featureLinks: [
      { label: "Five Principles course", url: "https://thenaturallifestyles.com/online-academy/", lookFor: "Course structure, pricing, video previews" },
      { label: "Free course funnel", url: "https://thenaturallifestyles.com/free-course/", lookFor: "Lead capture page, what they give away" },
      { label: "YouTube", url: "https://www.youtube.com/@TheNaturalLifestyles", lookFor: "Content style, production quality" },
    ],
  },
  {
    id: "honest-signalz",
    name: "Honest Signalz",
    url: "https://honestsignalz.com",
    category: "daygame",
    figure: "Vadim Dorfman",
    audience: "~115K YT subs, 11.85M views, 12+ years",
    status: "Active",
    notes:
      "12+ years consistent content. Approachable tone, bridges hardcore PUA and mainstream. Distinctive pink+blue palette. Claims 1,000+ clients.",
    designNotes:
      "Modern layout, video background hero. Pink (#e72d64) + blue (#4f6df5) palette. Clear navigation. Pricing gated behind inquiry forms.",
    recommendation:
      "Color palette stands out. Study approachable tone. Proof that consistent content wins.",
    screenshots: [
      { label: "Homepage", files: ["honest-signalz.png", "honest-signalz-1.png", "honest-signalz-2.png", "honest-signalz-3.png", "honest-signalz-4.png", "honest-signalz-5.png"], pageUrl: "https://honestsignalz.com" },
      { label: "About Vadim", files: ["honest-signalz-about.png", "honest-signalz-about-1.png", "honest-signalz-about-2.png"], pageUrl: "https://honestsignalz.com/about-vadim/" },
      { label: "Bootcamp", files: ["honest-signalz-bootcamp.png", "honest-signalz-bootcamp-1.png", "honest-signalz-bootcamp-2.png"], pageUrl: "https://honestsignalz.com/bootcamp/" },
    ],
    featureLinks: [
      { label: "YouTube", url: "https://www.youtube.com/@HonestSignalz", lookFor: "Thumbnail style, consistent upload schedule" },
      { label: "Courses page", url: "https://honestsignalz.com/courses/", lookFor: "Course catalog, pricing model" },
    ],
  },
  {
    id: "tusk",
    name: "James Tusk",
    url: "https://jamestusk.com",
    category: "daygame",
    figure: "James Tusk",
    audience: "~31K YT (deleted Feb 2024)",
    status: "Active coaching, reduced content",
    notes:
      "London-based. 'Daygame for busy professionals' — targets efficiency over volume. 5-hour 1-on-1 sessions. International bootcamps. YT channel deletion hurt discoverability.",
    designNotes:
      "Wix-based site. Dark theme with video sales letter approach. Standard coaching layout.",
    recommendation:
      "'Busy professionals' positioning is exactly our target market. Our AI coaching = the ultimate time-saver.",
    screenshots: [
      { label: "Homepage", files: ["tusk.png", "tusk-1.png", "tusk-2.png", "tusk-3.png", "tusk-4.png", "tusk-5.png"], pageUrl: "https://jamestusk.com" },
    ],
    featureLinks: [
      { label: "Bootcamp info (Instagram)", url: "https://www.instagram.com/tusk_daygame_bootcamp/", lookFor: "Event format, locations, social proof" },
    ],
  },

  // ══════════════════════════════════════════
  // LIFE IMPROVEMENT / MASCULINITY
  // ══════════════════════════════════════════
  {
    id: "charisma",
    name: "Charisma on Command",
    url: "https://www.charismaoncommand.com",
    category: "lifestyle",
    figure: "Charlie Houpert",
    audience: "10M+ YT subs, 1B+ views",
    status: "Active, massive",
    notes:
      "Biggest in charisma/social skills niche. Celebrity analysis format. 'Charisma University' — $597, 30K+ members. Mainstream-friendly, no PUA label.",
    designNotes:
      "Clean WordPress/Elementor. Minimal nav. CTA funnels to ClickFunnels lead gen. Heavy analytics. YouTube is the real platform — site is conversion funnel.",
    recommendation:
      "Celebrity-analysis format could inspire our 'study this interaction' feature. Proves social-skills-without-PUA-stigma works at massive scale.",
    screenshots: [
      { label: "Homepage", files: ["charisma.png", "charisma-1.png", "charisma-2.png", "charisma-3.png"], pageUrl: "https://www.charismaoncommand.com" },
    ],
    featureLinks: [
      { label: "Charisma University", url: "https://university.charismaoncommand.com/", lookFor: "Course sales page, pricing, 6-module structure" },
      { label: "YouTube (10M+ subs)", url: "https://www.youtube.com/@charismaoncommand", lookFor: "Celebrity breakdown format, thumbnail patterns" },
    ],
    videos: [
      { label: "CoC — celebrity charisma breakdown", embedUrl: "https://www.youtube.com/embed/nN9QuMZH0GY" },
    ],
  },
  {
    id: "artofmanliness",
    name: "Art of Manliness",
    url: "https://www.artofmanliness.com",
    category: "lifestyle",
    figure: "Brett McKay",
    audience: "10M/mo pageviews, 1.2M YT, 1M+ podcast",
    status: "Active, established",
    notes:
      "The OG men's lifestyle site since 2008. Largest independent men's site on the internet. Traditional/stoic masculinity: skills, character, fatherhood. Covers relationships extensively.",
    designNotes:
      "Editorial/magazine layout. 5-category top nav (Style, Strong, Social, Skilled, Cultured) — great taxonomy. Long-form articles. Affiliate links.",
    recommendation:
      "Content taxonomy (5 clear categories) is excellent info architecture. 'Social' section closest to our niche. Proves masculine brand can be mainstream.",
    screenshots: [
      { label: "Homepage", files: ["artofmanliness.png", "artofmanliness-1.png", "artofmanliness-2.png", "artofmanliness-3.png", "artofmanliness-4.png"], pageUrl: "https://www.artofmanliness.com" },
      { label: "Get Social section", files: ["artofmanliness-social.png", "artofmanliness-social-1.png", "artofmanliness-social-2.png"], pageUrl: "https://www.artofmanliness.com/get-social/" },
      { label: "Get Strong section", files: ["artofmanliness-strong.png", "artofmanliness-strong-1.png", "artofmanliness-strong-2.png"], pageUrl: "https://www.artofmanliness.com/get-strong/" },
    ],
    featureLinks: [
      { label: "Get Social (dating adjacent)", url: "https://www.artofmanliness.com/get-social/", lookFor: "Article categories, content taxonomy" },
      { label: "Podcast", url: "https://www.artofmanliness.com/podcast/", lookFor: "Episode archive, guest lineup" },
    ],
  },
  {
    id: "huberman",
    name: "Huberman Lab",
    url: "https://www.hubermanlab.com",
    category: "lifestyle",
    figure: "Dr. Andrew Huberman",
    audience: "7.4M YT, 8M IG, #1 health podcast",
    status: "Active, massive",
    notes:
      "Stanford neuroscientist. Testosterone, dopamine, sleep, attraction biology — directly relevant without the 'pickup' label. 'Protocols' book. AI tool for querying episodes.",
    designNotes:
      "Modern, polished, premium. Cyan blue brand. Episode grid, 30+ topic categories, sticky search. Best-designed lifestyle site on this list.",
    recommendation:
      "Study content library UX — topic taxonomy, search, browsing. 'Protocols' concept maps to our coaching methodology. Science-backed credibility = our goal.",
    screenshots: [
      { label: "Homepage", files: ["huberman.png", "huberman-1.png", "huberman-2.png", "huberman-3.png", "huberman-4.png", "huberman-5.png"], pageUrl: "https://www.hubermanlab.com" },
      { label: "Podcast library", files: ["huberman-podcast.png", "huberman-podcast-1.png", "huberman-podcast-2.png", "huberman-podcast-3.png"], pageUrl: "https://www.hubermanlab.com/podcast" },
      { label: "Newsletter", files: ["huberman-newsletter.png", "huberman-newsletter-1.png", "huberman-newsletter-2.png"], pageUrl: "https://www.hubermanlab.com/newsletter" },
    ],
    featureLinks: [
      { label: "Podcast (topic filter UX)", url: "https://www.hubermanlab.com/podcast", lookFor: "Category chips, search, episode grid — best content library UX in the space" },
      { label: "YouTube", url: "https://www.youtube.com/@hubaboratory", lookFor: "Long-form format, thumbnail style, chapter markers" },
    ],
  },
  {
    id: "rational-male",
    name: "The Rational Male",
    url: "https://therationalmale.com",
    category: "lifestyle",
    figure: "Rollo Tomassi",
    audience: "184K Twitter, bestselling book trilogy",
    status: "Active",
    notes:
      "Intellectual architect of the Red Pill framework. Concepts (hypergamy, SMV) became universal vocabulary. No courses — influence through ideas and books only.",
    designNotes:
      "Traditional WordPress blog. Blue highlights, PT Serif font. No funnels, no pop-ups. Just essays and book links. Cloudflare-protected.",
    recommendation:
      "Proof that intellectual depth creates durable influence. His concepts are embedded in our coaching framework.",
    screenshots: [
      { label: "Homepage (Cloudflare-blocked)", files: ["rational-male.png"] },
    ],
    featureLinks: [
      { label: "Blog", url: "https://therationalmale.com", lookFor: "WordPress blog, blue accents, PT Serif, essay-focused layout" },
      { label: "Books on Amazon", url: "https://www.amazon.com/s?k=the+rational+male+rollo+tomassi", lookFor: "Trilogy, review count and quality" },
      { label: "Substack", url: "https://rationalmale.substack.com", lookFor: "Active posting, subscriber engagement" },
      { label: "Twitter/X", url: "https://twitter.com/RationalMale", lookFor: "184K followers, discourse style" },
    ],
  },
  {
    id: "rsd",
    name: "RSD Nation",
    url: "https://articles.rsdnation.com",
    category: "lifestyle",
    figure: "Owen Cook (Tyler)",
    audience: "Historical millions. Now reduced.",
    status: "Legacy / declined",
    notes:
      "Near-monopoly on dating coaching through 2010s. Pioneered shift from routines to inner game. Invented YouTube pickup format. ~1,000 programs/year at peak. MeToo controversy destroyed the brand.",
    designNotes:
      "Current site is barebones mentoring application. Brand lives in YouTube archives. Historically pioneered 'free value' content model.",
    recommendation:
      "Study their arc: free YouTube → bootcamps → decline. The model they pioneered is what everyone follows. Their fall = risk of personality-dependent brands.",
    screenshots: [
      { label: "Current site (barebones)", files: ["rsd.png"] },
    ],
    featureLinks: [
      { label: "Owen Cook (RSD Tyler) YouTube", url: "https://www.youtube.com/@OwenCook", lookFor: "Current positioning, content pivot from PUA to self-improvement" },
      { label: "Web Archive (peak era 2016)", url: "https://web.archive.org/web/2016/https://www.rsdnation.com/", lookFor: "Forum community, instructor roster, course catalog" },
    ],
    videos: [
      { label: "Owen Cook — current style", embedUrl: "https://www.youtube.com/embed/3LY7fjMl8rE" },
    ],
  },
  {
    id: "orderofman",
    name: "Order of Man",
    url: "https://orderofman.com",
    category: "lifestyle",
    figure: "Ryan Michler (combat vet)",
    audience: "500+ Iron Council members, 400+ podcast eps",
    status: "Active, niche",
    notes:
      "Military/warrior ethos + fatherhood/leadership. 'Iron Council' = paid digital fraternity. Guests: Jocko Willink, Goggins, Robert Greene. Physical products (leather planner).",
    designNotes:
      "Clean, masculine. Dark backgrounds + orange accent (#ef6c0f). Content funnels toward Iron Council. Physical products build trust.",
    recommendation:
      "Community (Iron Council) model worth studying. Orange + dark navy = very masculine palette. 'Brotherhood' angle could inspire our community features.",
    screenshots: [
      { label: "Homepage", files: ["orderofman.png", "orderofman-1.png", "orderofman-2.png", "orderofman-3.png", "orderofman-4.png", "orderofman-5.png"], pageUrl: "https://orderofman.com" },
      { label: "Iron Council (community)", files: ["orderofman-ironcouncil.png", "orderofman-ironcouncil-1.png", "orderofman-ironcouncil-2.png"], pageUrl: "https://orderofman.com/iron-council/" },
      { label: "Podcast", files: ["orderofman-podcast.png", "orderofman-podcast-1.png", "orderofman-podcast-2.png"], pageUrl: "https://orderofman.com/podcast/" },
    ],
    featureLinks: [
      { label: "Iron Council (community model)", url: "https://orderofman.com/iron-council/", lookFor: "Membership structure, pricing, brotherhood positioning" },
      { label: "Battle Planner (physical product)", url: "https://orderofman.com/store/", lookFor: "Leather planner, merch — physical products as trust signal" },
    ],
  },
  {
    id: "hormozi",
    name: "Alex Hormozi / Acquisition",
    url: "https://www.acquisition.com",
    category: "lifestyle",
    figure: "Alex Hormozi",
    audience: "3.8M YT, 12M+ total social",
    status: "Active, massive",
    notes:
      "Dominant in business self-improvement. Not a dating coach but massive pull on young men. Made courses free (lead gen for portfolio). Co-owns Skool.",
    designNotes:
      "Modern, bold. Purple (#6F00FF) + dark navy. Clear product hierarchy. Every element has a purpose — very conversion-optimized.",
    recommendation:
      "Study 'give everything away free' model. Purple/navy palette is distinctive and premium. Skool platform = community comparison point.",
    screenshots: [
      { label: "Homepage", files: ["hormozi.png", "hormozi-1.png", "hormozi-2.png", "hormozi-3.png", "hormozi-4.png", "hormozi-5.png"], pageUrl: "https://www.acquisition.com" },
      { label: "Free Courses", files: ["hormozi-courses.png", "hormozi-courses-1.png", "hormozi-courses-2.png", "hormozi-courses-3.png"], pageUrl: "https://www.acquisition.com/courses" },
      { label: "About the Firm", files: ["hormozi-about.png", "hormozi-about-1.png", "hormozi-about-2.png"], pageUrl: "https://www.acquisition.com/about-the-firm" },
    ],
    featureLinks: [
      { label: "Free courses (lead gen model)", url: "https://www.acquisition.com/courses", lookFor: "Free high-value courses, email capture, portfolio funnel" },
      { label: "Skool community platform", url: "https://www.skool.com", lookFor: "Community + course platform Hormozi co-owns" },
      { label: "YouTube", url: "https://www.youtube.com/@AlexHormozi", lookFor: "Thumbnail style, content density, editing pace" },
    ],
    videos: [
      { label: "Hormozi — content style", embedUrl: "https://www.youtube.com/embed/gqEPNz67L5I" },
    ],
  },

  // ══════════════════════════════════════════
  // DESIGN INSPIRATION
  // ══════════════════════════════════════════
  {
    id: "linear",
    name: "Linear",
    url: "https://linear.app",
    category: "design",
    figure: "Karri Saarinen (CEO)",
    audience: "Industry-standard project management",
    status: "Active, benchmark",
    notes:
      "Most cited 'best-designed SaaS app'. Keyboard-first UX (Cmd+K). Fluid water-like animations. Shimmer/spotlight effects. Dense layouts. LCH color system.",
    designNotes:
      "Dark mode: near-black, layered surfaces. Bold Inter Display typography. Monochrome + selective brand color. Radix UI + Framer Motion.",
    recommendation:
      "MUST STUDY for app UX. List views, command palette, dark mode system directly applicable to our session/goal tracking.",
    screenshots: [
      { label: "Homepage", files: ["linear.png", "linear-1.png", "linear-2.png", "linear-3.png", "linear-4.png", "linear-5.png", "linear-6.png"], pageUrl: "https://linear.app" },
      { label: "Features", files: ["linear-features.png", "linear-features-1.png", "linear-features-2.png", "linear-features-3.png"], pageUrl: "https://linear.app/features" },
      { label: "Method (design philosophy)", files: ["linear-method.png", "linear-method-1.png", "linear-method-2.png", "linear-method-3.png"], pageUrl: "https://linear.app/method" },
    ],
    featureLinks: [
      { label: "Homepage (shimmer hero animation)", url: "https://linear.app", lookFor: "Shimmer gradient on hero text, smooth scroll transitions" },
      { label: "Features (product animations)", url: "https://linear.app/features", lookFor: "Each feature has a 'telling animation' that demonstrates what it does" },
      { label: "Method (design philosophy doc)", url: "https://linear.app/method", lookFor: "Their design principles — opinionated, momentum, craft" },
      { label: "Linear UI redesign blog", url: "https://linear.app/blog/redesigning-linear", lookFor: "How they approached the LCH color system" },
      { label: "Rebuilding Linear.app (code)", url: "https://github.com/frontendfyi/rebuilding-linear.app", lookFor: "Full Next.js + Tailwind + Framer Motion recreation of their effects" },
    ],
  },
  {
    id: "raycast",
    name: "Raycast",
    url: "https://www.raycast.com",
    category: "design",
    figure: "Thomas Mann (CEO)",
    audience: "macOS productivity tool",
    status: "Active",
    notes:
      "One of the best developer tool marketing sites. Deep dark + purple/pink/blue gradient glow halos. Animated product demo in hero. Clean store card grid.",
    designNotes:
      "Dark + gradient glow 'hero spotlight'. Soft radial gradients create depth. Large clean headings. Built with Next.js.",
    recommendation:
      "Steal the gradient spotlight/glow hero effect — easy with Tailwind radial-gradient. Animated product walkthrough for onboarding.",
    screenshots: [
      { label: "Homepage", files: ["raycast.png", "raycast-1.png", "raycast-2.png", "raycast-3.png", "raycast-4.png", "raycast-5.png", "raycast-6.png"], pageUrl: "https://www.raycast.com" },
      { label: "Extension Store", files: ["raycast-store.png", "raycast-store-1.png", "raycast-store-2.png"], pageUrl: "https://www.raycast.com/store" },
      { label: "Pro (pricing)", files: ["raycast-pro.png", "raycast-pro-1.png", "raycast-pro-2.png"], pageUrl: "https://www.raycast.com/pro" },
    ],
    featureLinks: [
      { label: "Homepage (gradient glow hero)", url: "https://www.raycast.com", lookFor: "Animated gradient blobs, dark theme, product demo" },
      { label: "Store (card grid pattern)", url: "https://www.raycast.com/store", lookFor: "Card hover states, icon grid, category filters" },
      { label: "Figma design file (public)", url: "https://www.figma.com/community/file/1367387900890415538/raycast-com-web-pages-ui", lookFor: "Exact design tokens, spacing, component structure" },
    ],
  },
  {
    id: "superhuman",
    name: "Superhuman",
    url: "https://superhuman.com",
    category: "design",
    figure: "Rahul Vohra (CEO)",
    audience: "Premium email client ($30/mo)",
    status: "Active",
    notes:
      "Most influential 'premium productivity app' design. Carbon mode: 5 shades of gray. 90% opacity text. Keyboard-first. Cmd+K command palette.",
    designNotes:
      "Minimal chrome. No visible toolbars unless called. Micro-interactions. The 5-shade gray system is the most rigorous dark mode approach publicly documented.",
    recommendation:
      "THE dark mode reference. Copy 5-shade gray system + 90% opacity text. Blog post on dark theme design is required reading.",
    screenshots: [
      { label: "Homepage", files: ["superhuman.png", "superhuman-1.png", "superhuman-2.png", "superhuman-3.png", "superhuman-4.png", "superhuman-5.png", "superhuman-6.png"], pageUrl: "https://superhuman.com" },
      { label: "Pricing", files: ["superhuman-pricing.png", "superhuman-pricing-1.png", "superhuman-pricing-2.png"], pageUrl: "https://superhuman.com/pricing" },
      { label: "Blog", files: ["superhuman-blog.png", "superhuman-blog-1.png", "superhuman-blog-2.png"], pageUrl: "https://superhuman.com/blog" },
    ],
    featureLinks: [
      { label: "How to design delightful dark themes (MUST READ)", url: "https://blog.superhuman.com/how-to-design-delightful-dark-themes/", lookFor: "5-shade gray system, opacity text, spatial depth model" },
      { label: "Homepage (product animations)", url: "https://superhuman.com", lookFor: "Purple gradient hero, feature demo animations, split inbox reveal" },
      { label: "Blog (design articles)", url: "https://superhuman.com/blog", lookFor: "Design process posts, UX philosophy" },
    ],
  },
  {
    id: "vercel",
    name: "Vercel",
    url: "https://vercel.com",
    category: "design",
    figure: "Guillermo Rauch (CEO)",
    audience: "Next.js hosting/deployment",
    status: "Active, benchmark",
    notes:
      "Open-source Geist design system. Direction-aware nav hover. Clean dashboard. Animation philosophy: 'only when it clarifies cause & effect'. GPU-only properties.",
    designNotes:
      "Dark-first. Single accent, ~10% opacity borders. Beam/glow effects on cards. Geist font. Next.js + Tailwind.",
    recommendation:
      "Same stack as us. Adopt Geist design tokens. Direction-aware nav hover = quick win. Read Web Interface Guidelines.",
    screenshots: [
      { label: "Homepage", files: ["vercel.png", "vercel-1.png", "vercel-2.png", "vercel-3.png", "vercel-4.png", "vercel-5.png", "vercel-6.png"], pageUrl: "https://vercel.com" },
      { label: "AI Products", files: ["vercel-products.png", "vercel-products-1.png", "vercel-products-2.png", "vercel-products-3.png"], pageUrl: "https://vercel.com/products/ai" },
      { label: "Templates", files: ["vercel-templates.png", "vercel-templates-1.png", "vercel-templates-2.png"], pageUrl: "https://vercel.com/templates" },
    ],
    featureLinks: [
      { label: "Homepage (beam/glow animations)", url: "https://vercel.com", lookFor: "Prism animation, gradient hero, beam borders on feature cards" },
      { label: "Geist Design System", url: "https://vercel.com/geist/introduction", lookFor: "Color tokens, typography scale, component primitives — we can adopt this" },
      { label: "Web Interface Guidelines", url: "https://vercel.com/design/guidelines", lookFor: "Animation rules, optimistic UI, accessibility, dark mode approach" },
      { label: "Direction-aware nav tutorial", url: "https://abubalogun.medium.com/how-to-create-vercel-style-navigation-animation-09d169961f12", lookFor: "Exact implementation of their nav hover effect" },
      { label: "v0 (AI UI generator)", url: "https://v0.dev", lookFor: "shadcn/ui component generation — same components we use" },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    url: "https://stripe.com",
    category: "design",
    figure: "Patrick Collison (CEO)",
    audience: "Payment infrastructure",
    status: "Active, benchmark",
    notes:
      "Most analyzed marketing site. Animated mesh gradient hero (WebGL). 'Telling animations'. Exceptional table/list design. Status badges with semantic color.",
    designNotes:
      "Row hover states, slide-in detail drawers. Sharp copywriting synced to motion. Stripe Press = best-in-class long-form.",
    recommendation:
      "Steal row-hover + slide-in detail panel for session lists. Mesh gradient iconic but heavy — use CSS approx. Dashboard list patterns perfect for our data.",
    screenshots: [
      { label: "Homepage", files: ["stripe.png", "stripe-1.png", "stripe-2.png", "stripe-3.png", "stripe-4.png", "stripe-5.png", "stripe-6.png"], pageUrl: "https://stripe.com" },
      { label: "Payments product", files: ["stripe-payments.png", "stripe-payments-1.png", "stripe-payments-2.png", "stripe-payments-3.png"], pageUrl: "https://stripe.com/payments" },
      { label: "Billing product", files: ["stripe-billing.png", "stripe-billing-1.png", "stripe-billing-2.png"], pageUrl: "https://stripe.com/billing" },
    ],
    featureLinks: [
      { label: "Homepage (mesh gradient animation)", url: "https://stripe.com", lookFor: "The iconic WebGL animated gradient — 4 morphing color blobs" },
      { label: "Payments (telling animations)", url: "https://stripe.com/payments", lookFor: "Each feature animates to SHOW what it does, not just describe it" },
      { label: "Stripe gradient breakdown (code)", url: "https://www.bram.us/2021/10/13/how-to-create-the-stripe-website-gradient-effect/", lookFor: "Technical breakdown of the WebGL mesh gradient implementation" },
      { label: "Stripe Press (editorial design)", url: "https://press.stripe.com", lookFor: "Best-in-class long-form reading design, typography" },
      { label: "Stripe Design Patterns (docs)", url: "https://docs.stripe.com/stripe-apps/patterns", lookFor: "Official UI patterns for their app ecosystem" },
    ],
  },
  {
    id: "resend",
    name: "Resend",
    url: "https://resend.com",
    category: "design",
    figure: "Zeno Rocha (CEO)",
    audience: "Email API for developers",
    status: "Active",
    notes:
      "Masterclass in beautiful developer tools. Radix Colors + Tailwind for dark mode. Lottie animated icons. High density without clutter. Geist Mono for data.",
    designNotes:
      "Deep dark (#0a0a0a). Light borders (~5% opacity white). Minimal sidebar, monospace data, status badges. filter: invert(1) for dark-mode icons.",
    recommendation:
      "IDENTICAL STACK to ours (Next.js + Tailwind + Radix). Most practical dark mode system we could adopt. Study their dashboard.",
    screenshots: [
      { label: "Homepage", files: ["resend.png", "resend-1.png", "resend-2.png", "resend-3.png", "resend-4.png", "resend-5.png"], pageUrl: "https://resend.com" },
      { label: "Docs", files: ["resend-docs.png", "resend-docs-1.png", "resend-docs-2.png"], pageUrl: "https://resend.com/docs/introduction" },
      { label: "Pricing", files: ["resend-pricing.png", "resend-pricing-1.png", "resend-pricing-2.png"], pageUrl: "https://resend.com/pricing" },
    ],
    featureLinks: [
      { label: "Homepage (3D dark hero)", url: "https://resend.com", lookFor: "Dark cube animation, serif+sans type pairing, gradient dividers" },
      { label: "Introducing Light Mode (blog — dark mode system explained)", url: "https://resend.com/blog/introducing-light-mode", lookFor: "How they retrofitted theming — Radix Colors → Tailwind CSS vars" },
      { label: "React Email (open source)", url: "https://github.com/resend/react-email", lookFor: "Their open source project — shows component architecture" },
      { label: "Tech stack details", url: "https://resend.com/handbook/engineering/what-is-our-tech-stack", lookFor: "Exact stack: Next.js, Tailwind, Radix, Drizzle" },
    ],
  },
  {
    id: "aceternity",
    name: "Aceternity UI",
    url: "https://ui.aceternity.com",
    category: "design",
    figure: "Manu Arora",
    audience: "Open-source component library",
    status: "Active",
    notes:
      "Copy-paste implementations of effects from Linear/Vercel/Stripe/Raycast. Spotlight cards, beam borders, bento grids, typewriter, 3D tilt, aurora. MIT licensed.",
    designNotes:
      "Not a site to study for layout — it IS the implementation toolkit. Every component = 20-50 lines of React + Tailwind. Directly droppable.",
    recommendation:
      "IMPLEMENTATION SHORTCUT. Spotlight card for goals, bento grid for dashboard, typewriter for AI feedback display.",
    screenshots: [
      { label: "Homepage", files: ["aceternity.png", "aceternity-1.png", "aceternity-2.png", "aceternity-3.png", "aceternity-4.png"], pageUrl: "https://ui.aceternity.com" },
      { label: "Component library", files: ["aceternity-components.png", "aceternity-components-1.png", "aceternity-components-2.png", "aceternity-components-3.png"], pageUrl: "https://ui.aceternity.com/components" },
      { label: "Spotlight effect", files: ["aceternity-spotlight.png", "aceternity-spotlight-1.png", "aceternity-spotlight-2.png"], pageUrl: "https://ui.aceternity.com/components/spotlight" },
      { label: "Bento grid", files: ["aceternity-bento.png", "aceternity-bento-1.png", "aceternity-bento-2.png"], pageUrl: "https://ui.aceternity.com/components/bento-grid" },
    ],
    featureLinks: [
      { label: "Spotlight Card (Linear-style mouse glow)", url: "https://ui.aceternity.com/components/spotlight", lookFor: "Mouse-following radial gradient on cards — ~30 lines of React" },
      { label: "Bento Grid (dashboard layout)", url: "https://ui.aceternity.com/components/bento-grid", lookFor: "Asymmetric feature grid — perfect for dashboard stats" },
      { label: "Typewriter Effect", url: "https://ui.aceternity.com/components/typewriter-effect", lookFor: "Text typing animation — great for AI coaching response display" },
      { label: "Background Beams", url: "https://ui.aceternity.com/components/background-beams", lookFor: "Animated light beams — Vercel-style border glow" },
      { label: "3D Card Effect", url: "https://ui.aceternity.com/components/3d-card-effect", lookFor: "Perspective tilt on hover — striking for feature/goal cards" },
      { label: "Sticky Scroll Reveal", url: "https://ui.aceternity.com/components/sticky-scroll-reveal", lookFor: "Content reveals on scroll with sticky left panel — great for methodology explainer" },
      { label: "Aurora Background", url: "https://ui.aceternity.com/components/aurora-background", lookFor: "Animated aurora effect — ambient hero background" },
      { label: "All components", url: "https://ui.aceternity.com/components", lookFor: "Full catalog — browse and pick what fits" },
    ],
  },
]

const CATEGORY_LABELS: Record<Category, { label: string; icon: typeof Globe }> = {
  all: { label: "All Sites", icon: Globe },
  daygame: { label: "Daygame Competitors", icon: Swords },
  lifestyle: { label: "Life Improvement", icon: Heart },
  design: { label: "Design Inspiration", icon: Palette },
}

const CATEGORY_COLORS: Record<string, string> = {
  daygame: "bg-red-500/10 text-red-400 border-red-500/20",
  lifestyle: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  design: "bg-purple-500/10 text-purple-400 border-purple-500/20",
}

function ScreenshotGallery({ group }: { group: ScreenshotGroup }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const total = group.files.length

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground/70">{group.label}</span>
          {group.pageUrl && (
            <a
              href={group.pageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="size-3 inline mr-0.5" />
              visit
            </a>
          )}
        </div>
        {total > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="px-2 py-0.5 text-xs rounded bg-muted hover:bg-muted/80 disabled:opacity-30 transition-colors"
            >
              ←
            </button>
            <span className="text-[10px] text-muted-foreground min-w-[3rem] text-center">
              {currentIdx + 1} / {total}
            </span>
            <button
              onClick={() => setCurrentIdx(Math.min(total - 1, currentIdx + 1))}
              disabled={currentIdx === total - 1}
              className="px-2 py-0.5 text-xs rounded bg-muted hover:bg-muted/80 disabled:opacity-30 transition-colors"
            >
              →
            </button>
          </div>
        )}
      </div>
      <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-black/30 border border-border/30">
        <Image
          src={`/competitors/${group.files[currentIdx]}`}
          alt={`${group.label} — ${currentIdx + 1} of ${total}`}
          fill
          className="object-cover object-top"
          sizes="(max-width: 768px) 100vw, 800px"
          unoptimized
        />
      </div>
      {/* Thumbnail strip for multi-image groups */}
      {total > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {group.files.map((file, i) => (
            <button
              key={file}
              onClick={() => setCurrentIdx(i)}
              className={`relative shrink-0 w-16 h-10 rounded overflow-hidden border transition-all ${
                i === currentIdx ? "border-primary ring-1 ring-primary/50" : "border-border/30 opacity-60 hover:opacity-100"
              }`}
            >
              <Image
                src={`/competitors/${file}`}
                alt=""
                fill
                className="object-cover object-top"
                sizes="64px"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CompetitorsPage() {
  const [filter, setFilter] = useState<Category>("all")
  const [expandedSites, setExpandedSites] = useState<Set<string>>(new Set())

  const filtered = filter === "all" ? SITES : SITES.filter((s) => s.category === filter)

  const toggleExpand = (id: string) => {
    setExpandedSites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const expandAll = () => {
    if (expandedSites.size === filtered.length) {
      setExpandedSites(new Set())
    } else {
      setExpandedSites(new Set(filtered.map((s) => s.id)))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <Button asChild variant="ghost" size="sm" className="mb-4">
          <Link href="/test">
            <ArrowLeft className="size-4 mr-2" />
            Back to Test Pages
          </Link>
        </Button>

        <div className="mb-2">
          <h1 className="text-3xl font-bold">Competitor & Inspiration Sites</h1>
          <p className="text-muted-foreground mt-1">
            21 sites, 182+ screenshots across multiple pages per site. Click any screenshot to browse, or use the links to visit specific features and animations.
          </p>
        </div>

        {/* Filter tabs + expand all */}
        <div className="flex items-center justify-between mt-4 mb-8 flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => {
              const { label, icon: Icon } = CATEGORY_LABELS[cat]
              const isActive = filter === cat
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors border ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/20"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                  <span className="text-xs opacity-70">
                    ({cat === "all" ? SITES.length : SITES.filter((s) => s.category === cat).length})
                  </span>
                </button>
              )
            })}
          </div>
          <button
            onClick={expandAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {expandedSites.size === filtered.length ? "Collapse all" : "Expand all"}
          </button>
        </div>

        {/* Site cards */}
        <div className="space-y-4">
          {filtered.map((site, idx) => {
            const isExpanded = expandedSites.has(site.id)
            const totalScreenshots = site.screenshots.reduce((s, g) => s + g.files.length, 0)

            return (
              <div
                key={site.id}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                {/* Header row — always visible */}
                <button
                  onClick={() => toggleExpand(site.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold">{site.name}</h2>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[site.category]}`}
                      >
                        {site.category}
                      </span>
                      <span className="text-xs text-muted-foreground">— {site.figure}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] text-muted-foreground">
                      {totalScreenshots} screenshots
                    </span>
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border/50 p-5 space-y-6">
                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Audience:</span>{" "}
                        <span className="text-foreground/80">{site.audience}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>{" "}
                        <span className="text-foreground/80">{site.status}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    <p className="text-sm text-foreground/80 leading-relaxed">{site.notes}</p>

                    {/* Screenshot galleries */}
                    <div className="space-y-6">
                      {site.screenshots.map((group) => (
                        <ScreenshotGallery key={group.label} group={group} />
                      ))}
                    </div>

                    {/* Videos */}
                    {site.videos && site.videos.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Play className="size-3" />
                          Videos
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {site.videos.map((v) => (
                            <div key={v.embedUrl} className="space-y-1">
                              <span className="text-xs text-muted-foreground">{v.label}</span>
                              <div className="aspect-video rounded-lg overflow-hidden border border-border/30">
                                <iframe
                                  src={v.embedUrl}
                                  title={v.label}
                                  className="w-full h-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Feature Links */}
                    {site.featureLinks && site.featureLinks.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="size-3" />
                          Links to explore
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {site.featureLinks.map((link) => (
                            <a
                              key={link.url}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 p-3 hover:border-primary/30 hover:bg-muted/40 transition-colors"
                            >
                              <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-primary mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="text-sm font-medium text-foreground/90 group-hover:text-primary transition-colors">
                                  {link.label}
                                </div>
                                {link.lookFor && (
                                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                                    Look for: {link.lookFor}
                                  </div>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Design Notes + Recommendation */}
                    <div className="grid gap-4 sm:grid-cols-2 border-t border-border/30 pt-4">
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Design / UX
                        </h3>
                        <p className="text-sm text-foreground/70 leading-relaxed">
                          {site.designNotes}
                        </p>
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                          Recommendation
                        </h3>
                        <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                          {site.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
