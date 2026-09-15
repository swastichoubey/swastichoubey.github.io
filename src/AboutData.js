// ─── REPLACE src/AboutData.js WITH THIS ──────────────────────────────────────

export const ABOUT = {
  name: "Swasti Choubey",
  tagline: "I'm interested in how models behave when they know they're being evaluated, and what that does to how much we can trust the evaluations.",
  bio: [
    "I spent the last two years as a Product Manager shipping ML products: RAG systems, embedding evaluation, AI security, and saw a lot of production failures. The thing is that a system passing the test you designed for it tells you very little. This continued to be my takeaway through the Bluedot Technical AI Safety course. How do models figure out what's going on around them, and what changes once they figure out they're being tested?",
    "Right now I'm working on evaluation awareness because I strongly believe in the need for a science of evaluation. Alignment and interpretability are huge problems but I don't expect either to be solved soon. What I can do in the meantime is build better empirical evidence about how models actually behave, and eventually get at why, instead of just patching the symptoms.",
    "I'm moving from product into research step by step. Tracing a ChromaDB retrieval discrepancy across environments, writing about model collapse and the proxy problem, working through ARENA and Mathematics for Machine Learning, reading alignment faking literature for a survey paper, and building a security scanner for RAG pipelines.",
    "I got into this because I couldn't stop wondering how models think and how they get made to do harm. To be honest, I haven't enjoyed learning something this much in years. Now I'm trying to figure out which of these questions are worth the next ten years.",
  ],
  resumeUrl: "/Swasti_Choubey_Research_Resume.pdf",
}

export const EXPERIENCE = [
  {
    role: "Product Manager",
    org: "Vidzai Digital",
    period: "Nov 2024 — Present",
    location: "Remote, India",
    note: "Promoted from SWE after 2 months",
    highlights: [
      "Built human-in-the-loop video generation pipeline converting LLM-summarised text into structured JSON and dynamically rendered HTML templates",
      "0-to-1 launch of AI-native EdTech platform (Skillr) across a four-sided marketplace; scaled to 4,000+ users and 91%+ session engagement",
      "Diagnosed DAU drop to 20 via user interviews across 8 cohorts (200 users); drove recovery to 111 next-day",
      "Benchmarked 3 embedding models on multilingual corpus; identified F1-optimal retrieval threshold achieving 100% precision/recall, cut response time from 8–10s to 2–4s",
      "Conducted production VAPT; identified 8 critical/high/medium vulnerabilities including IDOR, CWE-613, CWE-942, and cross-subdomain PII cookie leakage",
      "Secured 2 Fortune 500 enterprise partnerships; led live demos for IIT Guwahati, Intel, Microsoft, and C-suite at international Bancassurance conference (Morocco)",
      "Launched LENS (simulation-based exploration) and AURA (psychometric-adaptive mentoring); scaled video curriculum 80% beyond target",
      "Built company-wide knowledge infrastructure: 61 Confluence docs across architecture, security, and implementation specs",
    ],
  },
  {
    role: "Product Operations Associate",
    org: "Credent Life Sciences",
    period: "Sep 2023 — Oct 2024",
    location: "Remote, India",
    highlights: [
      "Led platform migration to self-managed infrastructure; achieved 70% cost reduction",
      "Implemented MFA, usage logging, and security hardening across the stack",
    ],
  },
  {
    role: "Software Engineer Intern",
    org: "Cisco",
    period: "Jul 2022 — Sep 2022",
    location: "Remote, USA",
    highlights: [
      "Built ML-based anomaly detection system flagging Splunk log discrepancies and routing alerts to engineering teams",
      "Replaced a 4-step manual escalation chain with automated alerting",
    ],
  },
]

export const EDUCATION = [
  {
    degree: "Master of Computer Science",
    institution: "University of California, Irvine",
    period: "Sep 2021 — Mar 2023",
    notes: "Biomedical AI research: 15,000+ patient tumour samples for early cancer detection · ML & Data Mining, AI, Networking, Security",
  },
  {
    degree: "B.Tech Computer Science & Engineering",
    institution: "VIT University, Bhopal",
    period: "Sep 2017 — Jul 2021",
    notes: "CGPA 9.28 · Top 5 in class of 175 · Won Best Manager (100 candidates) · Founded Public Speaking Society (80+ members)",
  },
  {
    degree: "Technical AI Safety Course",
    institution: "BlueDot Impact",
    period: "Jun 2026 - Jul 2026",
    notes: "Completed",
  },
  {
    degree: "ARENA Curriculum",
    institution: "Independent",
    period: "15-09-2026 - present",
    notes: "Mechanistic interpretability track · In progress",
  },
]

export const WORK = [
  {
    title: "ChromaDB Reproducibility Investigation",
    type: "Finding",
    url: null,
    desc: "Traced a 289% score discrepancy across local and shared environments to a silent backend migration. Eliminated 8 layers of the retrieval stack through direct empirical testing. Published with full data and diagrams.",
  },
  {
    title: "RAG Security Scanner",
    type: "Project",
    url: "https://github.com/swastichoubey",
    desc: "ML-powered tool detecting prompt injection and PII leakage in RAG pipelines using trained classifiers and NER-based token classification. Outputs CWE-classified remediation reports.",
  },
  {
    title: "Structured LLM Evaluation Framework",
    type: "Project",
    url: null,
    desc: "Constraint-following benchmark with a 3×3 difficulty matrix (constraint count × conflict level), three-layer scoring, and a product decision framework mapping reliability against cost. Designed as a living benchmark triggered by model updates.",
  },
  {
    title: "Human-in-the-Loop Video Pipeline",
    type: "PRD",
    url: null,
    desc: "Full product spec and implementation for AI video generation with human review gates, reducing hallucination risk versus traditional generation while enforcing visual consistency at scale.",
  },
]

// icon lookup now happens by label (see BrandIcon in AboutPanel.jsx), not a
// stored field here.
export const SOCIALS = [
  { label: "GitHub",         handle: "swastichoubey",  url: "https://github.com/swastichoubey" },
  { label: "LinkedIn",       handle: "swasti-choubey", url: "https://linkedin.com/in/swasti-choubey" },
  { label: "Substack",       handle: "hybridantic",    url: "https://substack.com/@hybridantic" },
  /* { label: "LessWrong",      handle: "Swastii",        url: "https://lesswrong.com/users/swastii" },
  { label: "Google Scholar", handle: "Swasti Choubey", url: "https://scholar.google.com/citations?user=swastichoubey" }, */
  { label: "X",              handle: "@hybridantic",   url: "https://x.com/hybridantic" },
]