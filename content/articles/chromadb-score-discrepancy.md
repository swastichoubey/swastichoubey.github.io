---
title: Chasing a Score Discrepancy Through Eight Layers of ChromaDB
date: 2026-07
readTime: 10
type: experimental
kicker: [Reproducibility, Evaluation, ChromaDB]
dek: Identical code, identical corpus, identical embeddings and two production environments that still disagreed on every confidence score.
heroImage:
  src: /articles/chromadb-score-discrepancy/hero.png
  alt: Abstract network of connected nodes representing vector embedding space
meta:
  - label: Environments
    value: Local · Shared
  - label: ChromaDB Versions
    value: 0.5.23 → 1.0.20
  - label: Test Queries
    value: "29"
colophon: "Investigation conducted with Claude (I was called stupid about 4 individual times). Header image generated with ChatGPT"
---

This is the technical follow-up to [an earlier post](https://swastichoubey.github.io/emb-eval) on choosing an embedding model for a telephony retrieval system. That post covers how I landed on **static-similarity-mrl-multilingual-v1** after comparing it against MPNet and a few other candidates. This one covers what happened after I moved that setup from my local notebook to a shared environment — and the eight-layer elimination chain it took to understand why the numbers changed.

A couple months back, I was called to take a look at the RAG documents for a telephony use case because the team was struggling with getting the right responses among a myriad of other problems. Once I got access to the shared Jupyter notebook, I took a look at the corpus of a measly 28 documents and set about doing the following:

- Ensuring each document has a single, distinct intent
- Filler words are included in example queries
- Added more documents to account for different scenarios

Once the corpus had grown to 126 documents and the embedding model was settled, the next step was validating confidence-score thresholds so the system could route a query to the local knowledge base versus an LLM fallback. I ran that validation locally first: 29 queries across five categories: in-domain English, in-domain Hindi, out-of-domain, edge cases, and queries that are similar to in-domain but shouldn't match. I replicated the exact same notebook on a shared instance afterward, same code, same document corpus, same embedding model (brace yourself, this phrase is going to be repeated throughout the post), and the confidence scores had shifted across the board.

::divider[The Discrepancy]

## What Changed

Collapsing the 29 individual queries into their five categories makes the shift easy to see:

| Category | Local (0.5.23) | Shared (1.0.20) |
|---|---|---|
| In-domain English | 0.574 | 0.686 |
| In-domain Hindi | 0.485 | 0.626 |
| Out of domain | 0.085 | 0.331 |
| Edge cases | 0.367 | 0.529 |
| Similar but different | 0.443 | 0.599 |

Every category moved up, but not by the same amount. Out-of-domain queries moved the most, in relative terms, which is the part that actually matters for a routing decision. Two numbers from this dataset are worth separating clearly, because in an earlier draft of this piece I conflated them:

```stats
+289% | Out-of-domain avg | 0.085 → 0.331 (7 queries)
+129% | All irrelevant avg | 0.172 → 0.394 (OOD + edge + similar)
0.390 → 0.560 | Optimal threshold | shifted with the scores
```

The **289%** figure is the out-of-domain category specifically which are the queries that should score lowest. The **129%** figure is broader: out-of-domain, edge cases, and "similar but different" queries averaged together. Both are real, both come from the same dataset, they just answer different questions. I'm calling that out explicitly here because collapsing them into one unlabeled "false positive risk" number was the first mistake in my original draft of this analysis.

The practical consequence: a threshold tuned on the local environment's scores (0.390) doesn't transfer to shared. Recomputing it on shared data moves the optimal cutoff to 0.560 and using the old threshold on the new score distribution would have routed a meaningfully higher share of off-topic queries straight to the knowledge base instead of the LLM fallback.

To put it in perspective, in our telephony system, when a customer asks a question, we need to decide: "Do we have a good answer in our documentation, or should we use AI to generate a response?" This decision is based on a confidence score. The problem: on the shared system, even completely unrelated questions (like "What's the weather?" or "Tell me a joke") were getting much higher confidence scores. This meant that we might incorrectly think we have a good answer when we don't, leading to wrong or confusing responses for customers. This change in score intrigued me because despite using the same data and embedding model, the performance discrepancy was quite significant. To illustrate the same, here is a table comparing the confidence score of different queries in local vs shared environment:

| Query | Local | Shared |
|---|---|---|
| How can I pay my EMI? | 0.697 | **0.791** |
| What payment options? | 0.555 | **0.681** |
| Can I pay through UPI? | 0.593 | **0.687** |
| How do I mine bitcoins? | 0.087 | **0.331** |
| Weather today? | 0.059 | **0.309** |

*\*\*Please note that grammatical mistakes in the queries were deliberate in order to cater to non-English speakers*

::divider[The Investigation]

## Ruling Out the Obvious Suspect

The shared environment was running a newer ChromaDB — a version built on a Rust-rewritten core, versus the pure-Python implementation locally:

| Component | Local | Shared |
|---|---|---|
| ChromaDB | 0.5.23 | **1.0.20** |
| Chroma API | SegmentAPI (Python) | **RustBindingsAPI (Rust)** |
| langchain-chroma | 0.1.4 | **1.1.0** |
| PyTorch | 2.8.0+cpu | 2.9.0+cu128 |
| Sentence-Transformers | 5.1.2 | 5.1.2 |

The natural hypothesis: the Rust rewrite changed how raw distance gets converted into a similarity score. Chroma's own announcement backs up that something changed under the hood —

> "Local Chroma is 4× faster for common write and query workflows, thanks to a new core written in Rust."
> — trychroma.com, v1.0 pre-release announcement

— but faster isn't the same claim as different. I tested each layer of the pipeline directly rather than assume the two were related.

| # | Test | Result | Verdict |
|---|---|---|---|
| 1 | Raw L2 distance, synthetic vectors, `l2` space, both ChromaDB versions | Identical — squared L2 in both | Not the cause |
| 2 | Same test, `cosine` space | Identical — 0.006116 / 1.0 / 2.0, both | Not the cause |
| 3 | `langchain-chroma` version check | 0.1.4 (local) vs 1.1.0 (shared) | New suspect → test 4 |
| 4 | Full `similarity_search_with_relevance_scores` wrapper, synthetic vectors | Identical relevance scores, both versions | Not the cause |
| 5 | Embedding model output, real production strings, sha256 hash comparison | Byte-identical across both environments | Not the cause |
| 6 | ChromaDB's default `hnsw:space` when unset in code | Documented default is `l2`, unchanged across versions | Not the cause |
| 7 | `_select_relevance_score_fn` selection logic | Identical source — both fall through to the euclidean function | Not the cause |
| 8 | `_euclidean_relevance_score_fn` implementation | Identical: `1.0 - distance / sqrt(2)`, both versions | Not the cause |

At this point I thought that maybe I was hallucinating. Every deterministic, code-level layer from raw distance calculation, default distance space, formula selection logic, formula implementation, and the embedding model was proven to be identical between environments but the production score gap was real and its cause was not in any of the layers I could isolate with synthetic tests.

:::callout{label="A real calibration issue, found along the way"}
`_euclidean_relevance_score_fn`'s own docstring says it expects the *raw* Euclidean norm, scaled 0 to √2 — but Chroma's `l2` space returns *squared* L2 distance by default (confirmed in test 1). Feeding a squared distance into a formula built for a raw one is a genuine mismatch, present identically in both environments. It's not what's causing the local/shared gap, but it does mean neither score set is the calibrated 0–1 relevance score the function's own docs claim it produces.
:::

::divider[Ruling Out the Data]

## Same Vectors, Same Space

With every code path exonerated, the last place a difference could hide was the data itself — either the embeddings were subtly different between environments, or the documents backing each collection had drifted. I visualized the 29-query test set's embedding space, reduced to two dimensions with PCA, generated independently in both environments:

::figure[Query embedding space (PCA), generated independently in both environments.]{src="/articles/chromadb-score-discrepancy/pca-embeddings.png" alt="2D PCA projection of the 29 test query embeddings, colored by query type"}

I diffed the two renders pixel by pixel rather than eyeball them. The entire plot region came back byte-for-byte identical, zero difference. The only pixels that differed at all were inside the legend's text box, and that was font-rendering anti-aliasing from two different operating systems, not data. The embeddings are not the cause either.

::divider[Where This Leaves It]

## What's Left

Given that HNSW is an approximate nearest-neighbor index, the Python/SegmentAPI index-construction path (local, 0.5.23) and the Rust/RustBindingsAPI path (shared, 1.0.20+) may build structurally different graphs with different traversal, different approximation quality from the same embeddings once you're at real corpus scale (for example, the original 126-doc collection I was working with), even though the underlying distance math is provably identical.

I still don't have a definitive root cause, and I'm not going to pretend I do. What I have is a fully eliminated stack with raw distance, default space, formula selection, formula implementation, and the embeddings themselves being provably identical across the two environments along with a production score gap that's real anyway. If it is the HNSW build-time variance then it's not something I can fix by pinning a version number; it's a property of how approximate indexes work at scale, and I may never get a clean answer without instrumenting the index construction itself.

But the bug isn't really the point of this post. The point is what "same code" turned out to mean in practice: identical Python, identical corpus, identical model yet still not the same system. If I'd trusted that on faith, the shared environment would have been routing customers to an LLM with confidence scores calibrated for a completely different distribution, silently. The fix is not a formula or an upgrade. In fact this experiment proves that you cannot assume that an upgrade (of a database, a wrapper library, et cetra) is safe just because the diff looks small. Re-validate your thresholds every time your environment changes, not just when your code does. If a system can fail this silently while doing everything "right," the failure mode isn't in the code. Do with that what you will, but if you have any insights then I would love to hear them!

### TL;DR

1. Same code, same corpus, same embedding model, shared environment produced scores **~2–4x higher** on out-of-domain queries.
2. The obvious hypothesis — Rust rewrite changed the distance-to-similarity formula — was disproven directly, not assumed away.
3. Eight layers tested and eliminated: raw distance, cosine distance, langchain-chroma version, the full wrapper, embedding hash, default space, formula selection, formula implementation.
4. Embedding space verified pixel-identical between environments via direct diff, not visual inspection.
5. Residual cause is most likely HNSW index-construction variance at real corpus scale — untested, honestly flagged as open.
6. Practical takeaway: re-validate thresholds on every environment change, not just every code change.

::divider[Appendix]

### Test Environment

| Component | Local | Shared |
|---|---|---|
| Python | 3.9.7 | 3.12.3 |
| ChromaDB | 0.5.23 | 1.0.20 |
| langchain-chroma | 0.1.4 | 1.1.0 |
| Sentence-Transformers | 5.1.2 | 5.1.2 |
| Embedding model | static-similarity-mrl-multilingual-v1 | static-similarity-mrl-multilingual-v1 |
| Test set | 29 queries, 5 categories, EN + HI | 29 queries, 5 categories, EN + HI |
