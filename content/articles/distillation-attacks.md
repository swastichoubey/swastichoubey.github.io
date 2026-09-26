---
title: Distillation Attacks on LLMs
date: 2026-02
readTime: 5
type: opinion
cluster: AI Control
tags:
  - AI Safety
  - ML Security
excerpt: How model distillation can be exploited to transfer adversarial vulnerabilities across model families — and why this matters for AI safety.
draft: true
references:
  - id: hinton-2015-distillation
    title: Distilling the Knowledge in a Neural Network
    authors: Hinton et al.
    year: 2015
    url: 'https://arxiv.org/abs/1503.02531'
    kind: Paper
    note: Original paper introducing soft target distillation for model compression.
  - id: szegedy-2013-intriguing-properties
    title: Intriguing properties of neural networks
    authors: Szegedy et al.
    year: 2013
    url: 'https://arxiv.org/abs/1312.6199'
    kind: Paper
    note: Szegedy et al. on adversarial examples transferring across architectures.
  # FIXME: URL resolves to Shokri et al. 2016, "Membership Inference Attacks against Machine Learning Models", not a model-stealing paper
  - id: model-stealing
    title: Model Stealing via API Queries
    url: 'https://arxiv.org/abs/1610.05820'
    kind: Paper
    note: Black-box extraction attacks on commercial ML APIs.
---
