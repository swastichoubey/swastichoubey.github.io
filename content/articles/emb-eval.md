---
title: Choosing an Embedding Model for Telephony Retrieval
date: 2025-11
readTime: 10
type: experimental
kicker: [Retrieval, Embeddings, RAG]
dek: Findings from a comparative evaluation of three models on a multilingual, latency-sensitive production system.
heroImage:
  src: /articles/emb-eval/hero.jpg
  alt: Embedding model vectors visualized in 3D space
meta:
  - label: Models Compared
    value: MPNet · MRL · MRL_EN
  - label: Corpus Size
    value: 126 documents
  - label: Languages
    value: EN · HI · Hinglish
colophon: Originally published as a Confluence Document
---

I was working on an adaptive learning algorithm for my edtech platform when I was flagged by another team struggling with a retrieval system for structured Q&A content in a multilingual, latency-sensitive environment. The two biggest issues were inaccurate responses and high latency.

I started by inspecting the documents and optimizing document structure — primarily assigning an intent to each document and ensuring no intent duplication. This improved accuracy a little: for 7/10 queries, the top recalled document was correct. But it wasn't enough to cleanly separate a good match threshold from a poor one, and speed was still a serious problem.

This made me switch tactics and look at the embedding model instead. The model they were using was `text-embedding-ada-002` (1536 dimensions). I started evaluating alternatives.

## Candidate Models

| Model | Dim | Why it was interesting |
|---|---|---|
| static-similarity-mrl-multilingual-v1 | **1024** | Multilingual, lightweight, fast on CPU |
| intfloat/e5-base-v2 | 768 | High retrieval accuracy, strong general-purpose |
| all-mpnet-base-v2 | 768 | Sentence Transformers' highest-quality "all-*" model |
| BAAI/bge-base-en-v1.5 | 768 | Optimized for dense retrieval, strong MTEB scores |
| nomic-embed-text-v1 | 768 | Strong semantic performance, long context support |
| Qwen/Qwen2-0.5B-Embedding | 768 | Small, fast, multilingual, edge-hardware friendly |

After running preliminary tests and noting recall and speed, I filtered down to three finalists: **all-mpnet-base-v2**, **static-similarity-mrl-multilingual-v1**, and **static-retrieval-mrl-en-v1**.

::divider[On MRL]

## What Are Matryoshka Models?

Before getting into results, I want to talk about MRL, because it was the reason I got fixated on this class of models. This was my first practical experiment with retrieval-augmented generation — I genuinely did not know what embedding models were before this. While reading about `static-similarity-mrl-multilingual-v1` on HuggingFace, I saw this:

> "On CPU, this model is 100x to 400x faster than common options like multilingual-e5-small. On GPU, it's 10x to 25x faster."
> — HuggingFace model card, static-similarity-mrl-multilingual-v1

That is a huge claim. The latency problem we were dealing with was bad enough that I couldn't just accept it at face value. I needed to understand what was behind it and whether it would actually hold on my specific corpus.

Matryoshka Representation Learning takes its name from Russian nesting dolls — each doll contains a smaller version inside. MRL models store information the same way: more important information in earlier dimensions, progressively less in later ones. This allows the embedding to be **truncated at inference time** while retaining enough signal for retrieval. You can run the same model at 1024, 768, 256, 128, or 64 dimensions by simply slicing the output vector.

:::callout{label="Why this matters"}
Most embedding models produce fixed-size vectors. Truncating a standard embedding degrades performance severely because information is distributed uniformly. MRL's training objective explicitly optimizes every prefix of the vector, so truncation is nearly free.
:::

::divider[Experiment]

## Experimental Setup

### Models Under Test

| Model | Dim | Language | Key characteristic |
|---|---|---|---|
| **all-mpnet-base-v2** | 768 | English only | High semantic accuracy, slow throughput |
| **static-similarity-mrl-multilingual-v1** | **1024** | 50+ languages | Very fast, inference-optimized, MRL truncation |
| **static-retrieval-mrl-en-v1** | **1024** | English-primary | Fastest model tested, strong Recall@3/5 |

### Dataset & Queries

```stats
126 | Documents | EN · HI · Hinglish
13 | In-domain queries | + edge cases, OOD
9 | Multilingual queries | HI · Hinglish · ES
0 | Preprocessing | Raw evaluation only
```

Documents were structured, intent-labeled entries from a loan-recovery knowledge base — each mapping to a single intent with associated user questions, a system answer, and metadata. The test environment was CPU-only (Python 3.9.7, sentence-transformers 5.1.2, torch 2.8.0+cpu, faiss 1.12.0).

::divider[Results]

## Performance Metrics

### Encoding Speed

| Model | Avg Time | Docs/sec | Per Doc | Dim |
|---|---|---|---|---|
| **MPNet** | 78.87s | 1.60 | 626 ms | 768 |
| **MRL** | 0.33s | 383 | 2.61 ms | 1024 |
| **MRL_EN** | **0.09s** | **1337** | **0.75 ms** | 1024 |

MRL_EN encodes 126 documents in 94ms. MPNet takes 79 seconds. On this CPU-only setup, that is an 837× throughput difference — which is in the ballpark of the claimed 100–400× and confirms that the architecture advantage is real on this hardware, even if the exact multiplier depends on corpus and infrastructure.

### Retrieval Accuracy (In-domain)

| Model | Recall@1 | Recall@3 | Recall@5 | Avg Conf. | Avg Query Time |
|---|---|---|---|---|---|
| **MPNet** | **71.4%** | 85.7% | 114.3%* | 59.3% | 128.9 ms |
| **MRL** | 57.1% | 57.1% | 57.1% | 64.5% | **13.5 ms** |
| **MRL_EN** | 42.9% | 85.7% | 85.7% | 57.3% | **11.7 ms** |

\* Recall >100% occurs when the correct document appears in multiple retrieval windows across edge cases.

### Out-of-Domain Rejection

| Model | OOD Rejection Rate | Notes |
|---|---|---|
| **MPNet** | **100%** | Extremely strict |
| **MRL** | 66.7% | Occasionally hallucinates a domain match |
| **MRL_EN** | **100%** | Extremely strict |

### Multilingual Performance (raw)

| Model | ES Acc. | HI Acc. | Hinglish Acc. |
|---|---|---|---|
| **MPNet** | — | — | English-only |
| **MRL** | 0% | 42.9% | 0% |
| **MRL_EN** | 0% | 42.9% | 0% |

Hindi is the only language with useful signal at this evaluation scale. Spanish and Hinglish both returned 0%, but 1–2 queries per language is not enough to draw conclusions from — more on that in the limitations section.

### Dimension Truncation Robustness

| Model | 768-D | 256-D | 128-D | 64-D |
|---|---|---|---|---|
| **MRL** | 20% | 20% | 20% | 20% |
| **MRL_EN** | **40%** | **40%** | **40%** | **40%** |

MRL_EN is more durable under compression. Both models hold their accuracy flat across all tested truncation levels — which is the whole point of the Matryoshka training objective.

::divider[Side Experiment]

## Answer Masking

After settling on **static-similarity-mrl-multilingual-v1** as my primary model, I ran a second experiment: what happens if you remove the system answer from each document before embedding it?

Each knowledge base entry had three parts: user questions, a system answer, and metadata (intent, keywords, language). *Answer masking* keeps parts 1 and 3 and strips out the answer entirely. The embedding then represents what the user is asking — not what the system plans to reply with.

### Why This Matters

- **Prevents semantic leakage.** If many answers contain "You can pay via UPI…", every UPI-adjacent query starts scoring high against all payment intents — not just the correct one. The answer text anchors retrieval to responses rather than questions.
- **Keeps dynamic content out of the index.** System answers may include template variables like `{loan_amount}` or ephemeral wording. Masking keeps embeddings stable.
- **Follows RAG best practice.** Retrieve with question-like text, generate with model reasoning. Retrieving based on answer text inverts that relationship.
- **Shorter text = faster MRL encoding.** MRL models scale with token length, so fewer tokens per document directly reduces encoding time.

### Masking Results (28 documents, 9 queries)

| Model | Encoding Before | Encoding After | Change |
|---|---|---|---|
| **MPNet** | 1.9 docs/s | 2.2 docs/s | Noise-level |
| **MRL** | 549.7 docs/s | **826.2 docs/s** | **+50% faster** |
| **MRL_EN** | 1059.7 docs/s | 930.2 docs/s | Noise-level |

Retrieval accuracy was flat across all three models — Recall@1, @3, and @5 were statistically unchanged. Confidence scores differed by less than 0.2 percentage points. Query times were unchanged.

:::callout{label="Key finding"}
Models primarily rely on intent, topic, and user question text to retrieve — not the system answer. The answer contributes almost no semantic signal to the embedding. The real gain from masking is encoding speed for token-sensitive models, and the structural discipline it enforces on your knowledge base.
:::

I would still suggest leaving the answers in place during production for reference purposes. But answers should be stored in metadata, not indexed — only Topic + Intent + Questions + Keywords should be searchable.

::divider[Conclusion]

## Conclusion

These results represent **raw, unoptimized model behavior** — no preprocessing, reranking, normalization, or domain adaptation. Under these conditions, MPNet delivers the strongest out-of-the-box semantic accuracy. MRL and MRL_EN dominate on throughput and latency. Speed-optimized models are not inherently accuracy-optimized, especially on domain-specific multilingual tasks.

That said, MRL's lower Recall@1 is not an architectural limitation. It reflects the absence of the engineering layers that multilingual retrieval systems typically need. Follow-up tests confirmed that query and document normalization noticeably improved MRL's performance, particularly for Hindi and Hinglish. With standard retrieval-engineering steps — normalization, cross-encoder reranking, transliteration cleanup, domain fine-tuning — MRL can reach or surpass MPNet-level accuracy while retaining its massive speed advantage.

For a multilingual production system, MPNet is simply not viable. MRL was the correct base model for this use case.

### TL;DR

1. Raw eval only — no preprocessing, reranking, or fine-tuning.
2. MPNet has the highest out-of-the-box accuracy but is too slow (~626ms/doc on CPU) for production-scale multilingual retrieval.
3. MRL and MRL_EN are orders of magnitude faster. Lower Recall@1 in raw form is an engineering gap, not an architecture failure.
4. After normalization, MRL's accuracy improved noticeably — it is highly responsive to standard retrieval engineering.
5. Answer masking is safe for production: accuracy is flat, but MRL encoding speeds up ~50% due to shorter token sequences.
6. MRL handles Hindi moderately; Hinglish and Spanish both need more work and a much larger multilingual query set.

::divider[Limitations]

## What I'd Do Differently

This experiment is a useful sanity check, but it is not yet strong enough to support conclusions like "Model X is more accurate" or "answer masking is always safe in production." A few honest notes on what limits it:

:::callout{label="Query design"}
13 in-domain queries I wrote myself naturally align with how I structured the documents. Real queries are messier — this was confirmed when the system was hit with complex multi-intent queries in production.
:::

:::callout{label="No held-out test split"}
Document optimization and evaluation ran on the same query set. The optimizations were likely informed — consciously or not — by watching models fail. That is data leakage in experimental design terms.
:::

:::callout{label="Multilingual underpowered"}
9 queries across Hindi and Hinglish (plus one rogue Spanish query) is not enough to claim anything about multilingual performance. I'd want at least 30 queries per language.
:::

:::callout{label="CPU-only environment"}
MRL's speed advantage is real, but the magnitude changes significantly on GPU. The 837× throughput gap would compress considerably, affecting production viability calculations.
:::

:::callout{label="Small corpus"}
126 documents and 22 total queries. Results are slightly overfit to this specific use case. A larger, real-traffic dataset would give far more generalizable conclusions.
:::

:::callout{label="Mixed experiments"}
Model selection and document optimization ran concurrently. Separating them would let you attribute improvements cleanly — right now it's hard to know what helped what.
:::

::divider[Appendix]

### Test Environment

| Component | Version / Spec |
|---|---|
| Python | 3.9.7 |
| sentence-transformers | 5.1.2 |
| torch | 2.8.0+cpu |
| faiss | 1.12.0 |
| Hardware | CPU-only |
| Evaluation mode | Raw — no reranking, normalization, or fine-tuning |
