---
title: RAG Security Scanner
date: 2026-09
readTime: 15
type: project
cluster: Security
tags:
  - Security
  - RAG
  - AI Safety
excerpt: 'A security scanner for RAG pipelines that probes for prompt injection and PII leakage in retrieved chunks, producing a CWE-classified remediation report styled like a professional VAPT report. Detection runs on dedicated ML models — a fine-tuned DistilBERT classifier and spaCy NER — rather than an LLM judging its own output.'
featured: true
publishedAt:
  github: 'https://github.com/swastichoubey/RAGScan'
references:
  - id: greshake-2023-indirect-prompt-injection
    title: 'Not what you''ve signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection'
    authors: Greshake et al.
    year: 2023
    url: 'https://arxiv.org/abs/2302.12173'
    kind: paper
    note: Taxonomy of injection vectors in RAG and tool-augmented LLMs.
  - id: zhong-2023-corpus-poisoning
    title: Poisoning Retrieval Corpora by Injecting Adversarial Passages
    authors: Zhong et al.
    year: 2023
    url: 'https://arxiv.org/abs/2310.19156'
    kind: paper
    note: Adversarial manipulation of dense retrieval indexes.
---
