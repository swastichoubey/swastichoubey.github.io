---
title: Model Collapse Is A Misnomer
date: 2026-08
readTime: 8
type: opinion
cluster: Alignment
tags:
  - AI Safety
  - Training
  - Data Provenance
excerpt: 'What happens when models train on their own outputs recursively: a deep dive into the collapse phenomenon and mitigation strategies.'
featured: true
references:
  - id: shumailov-2023-curse-of-recursion
    title: 'The Curse of Recursion: Training on Generated Data Makes Models Forget'
    authors: Shumailov et al.
    year: 2023
    url: 'https://arxiv.org/abs/2305.17493'
    kind: paper
    note: Foundational paper on model collapse in self-consuming training loops.
  - id: graphite-2026-ai-articles
    title: AI Now Writes as Many Online Articles as Humans
    authors: Graphite
    year: 2026
    url: 'https://graphite.io/five-percent/research/ai-now-writes-as-many-online-articles-as-humans-do'
    kind: web
    note: 'Using three AI detectors (Pangram, GPTZero, Copyleaks) on ~55k Common Crawl articles, this study finds AI-generated articles now make up ~50% of new online articles.'
  - id: cacm-model-collapse
    title: 'Model Collapse Is Already Happening, We Just Pretend It Isn''t'
    url: 'https://cacm.acm.org/blogcacm/model-collapse-is-already-happening-we-just-pretend-it-isnt/'
    kind: web
    note: 'An opinion piece arguing that model collapse is unfolding gradually rather than catastrophically as models increasingly train on AI-generated web content, output variance quietly erodes toward homogenized, lower-information text (a photocopy of a photocopy effect), and the industry is largely ignoring it.'
  - id: zhang-2023-human-favoritism
    title: 'Human favoritism, not AI aversion: People''s perceptions (and bias) toward generative AI, human experts, and human–GAI collaboration in persuasive content generation'
    authors: Zhang & Gosline
    year: 2023
    url: 'https://www.cambridge.org/core/journals/judgment-and-decision-making/article/human-favoritism-not-ai-aversion-peoples-perceptions-and-bias-toward-generative-ai-human-experts-and-humangai-collaboration-in-persuasive-content-generation/419C4BD9CE82673EAF1D8F6C350C4FA8'
    kind: paper
    note: 'Zhang & Gosline (2023, Judgment and Decision Making): In experiments with professional content creators and ChatGPT-4 producing persuasive/advertising content, AI-generated and AI-finalized content was rated higher quality than human experts'' work, and the evaluation bias observed was human favoritism (labeling content as human-made raised its perceived quality) rather than AI aversion (disclosing AI involvement didn''t lower ratings).'
  - id: wikipedia-signs-of-ai-writing
    title: 'Wikipedia:Signs of AI writing'
    authors: Wikipedia contributors
    url: 'https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing'
    kind: web
    note: 'A community-maintained field guide cataloguing writing and formatting patterns characteristic of LLM chatbot output (formulaic structure, puffery, negative parallelisms, em-dash overuse, unedited prompt artifacts, etc.), with real examples from Wikipedia drafts.'
  - id: anthropic-2026-claude-watermarks
    title: How Claude's Watermarks Work
    authors: Anthropic
    year: 2026
    url: 'https://www.anthropic.com/news/claude-text-watermark'
    kind: web
    note: 'Anthropic announces statistical watermarking of Claude''s text outputs for EU AI Act compliance, using a SynthID-Text-based method that''s invisible to readers and probabilistic rather than definitive.'
  - id: witnessai-model-collapse
    title: 'AI Model Collapse: Understanding, Prevention, and the Future of Training Large Language Models'
    authors: WitnessAI
    url: 'https://witness.ai/blog/ai-model-collapse/'
    kind: web
    note: 'A vendor explainer blog defining model collapse as progressive LLM degradation from recursive training on AI-generated data, walking through its causes (data contamination, feedback loops, lack of provenance tracking), warning signs, and prevention strategies (human-data curation, provenance tracking, governance).'
---

According to an article published by [Graphite Growth](https://graphite.io/) in May 2026, half of the new English-language articles on the internet are no longer written by people. They found that within a year of the launch of ChatGPT, primarily AI-generated articles accounted for 35.9% of articles published and by Q1 2026, this number had risen to 49.9%. I will not go into the details of the study but if you would like to see a breakdown of their methodology you can do so [here](https://graphite.io/five-percent/research/ai-now-writes-as-many-online-articles-as-humans-do).

To understand why I started the article with this study and what it has to do with Model Collapse, I need you to know 2 things:

- AI developers rely on centralized archives like Common Crawl to get data for model training. Common Crawl regularly crawls billions of webpages and provides petabytes of data freely to the public.
- What model collapse actually is, which is covered in the next section. Though I would argue that this process is misnamed because what we are living through is not collapse but rather erosion. The difference is significant because erosion can still be mitigated but a collapse is a final outcome.

## What Is Model Collapse?

Model Collapse refers to the degradation of a model's performance caused by training on data generated by other AI systems. This means MODEL V2 being trained on MODEL V1's output and MODEL V3 being trained on MODEL V2's output and so on. Over time this recursive process leads to a sort of flattening of text output, that is to say that AI generated outputs lose flavor of the original source. But the threat of bland outputs is not the only problem. When new models are trained on primarily AI generated text and/or images, they also inherit the biases, errors and hallucinations embedded in those outputs. This inheritance of biases and hallucinations is what prompted me to write this article.

Now that we have established how model collapse starts, let me tie in the original study I quoted. If within 3 years of public availability of LLMs, the amount of AI-generated content is already on par with human-generated content, then we are headed towards a catastrophic deficit of rich and interesting data and given that data is the foundation of any AI system, a poor foundation does not bode well for the building.

The chain is simple: MODEL V1 generates an article that is published on the web and may contain biases or hallucinations. An archive (like [CommonCrawl](https://commoncrawl.org/), for example) crawls webpages and includes the article generated by MODEL V1. During training of MODEL V2, an AI developer leverages the archive to get data and the AI-generated article enters the training pipeline with all its biases and hallucinations intact. Now when MODEL V2 generates an output, not only will the output be a little more monotonous but it will be ingrained with the same biases and/or hallucination and it will present them as facts. This output will then be used to train MODEL V3 which will consume the same false information as facts. Thus, when a user asks a question to MODEL V3, the output will not only be bland but also gaslight the user into believing something that is not true at all. It is like the evil cousin of the Mandela Effect. Having covered hallucination propagation, I want to circle back to flavorless outputs or as I like to call it, "the endangerment of whimsy."

## What Gets Lost

I have loved reading since I was eight years old and became comfortable with English which is my second language and the way I communicate is a patchwork of fanfictions, books, tv shows and stray internet writing I have consumed since. Fanfictions hooked me in particular because they are unmistakably human: you get a glimpse of who the author is, how they think, what their culture is like. It lets me be privy to little facts about places and things I have never encountered in any other way. Reading is a joy because of that element of surprise, the whimsy that only a real person can put on a page.

Unfortunately when a model trains on the outputs of a previous model, it starts to lose the tails of the original distribution which means that the weirdness and surprises that made the data rich get smoothed out and each successive generation drifts a little further from the original, interesting source and converges towards a bland statistical mean that could only bring joy to Sheldon Cooper.

## Model Collapse Is A Misnomer, It Should Be Model Erosion

I believe that model collapse is a misnomer for the process; it is actually Model Erosion and the collapse is just the final event. Let me clarify that. When I first read about model collapse [here](https://witness.ai/blog/ai-model-collapse/), I was mentally equating it to soil erosion because of the following:

### The Four Stages Of Erosion

- "Model Collapse" doesn't happen overnight, it is generational decay. Model V2 trains on Model V1's output, and MODEL V3 trains on V2, minor statistical errors, biases, and hallucinations compound. In parallel, a single rainstorm doesn't destroy a mountain, it just washes away a thin layer of the topsoil. In this analogy, each generation of synthetic data training acts like a rainstorm, washing away the rare, high-quality "human data" points.
- Just like the loss of the fertile topsoil leading to desertification, model collapse causes a loss of data diversity (remembering only the most common averages) as a result of which the output becomes repetitive, generic, and sterile.
- The root cause of model collapse is feeding the model its own synthetic, AI-generated content instead of fresh, organic human data which is kind of equivalent to deforestation and overgrazing if you equate removing human data to ripping trees off a hillside.
- And finally, the landslide. A landslide is the consequence of erosion. In the case of AI, this is equivalent to the unmitigated degradation reaching a tipping point after which the model's outputs become complete gibberish, functionally useless, or detached from reality.

The stage we are at right now, should ideally be called the erosion stage. Collapse will be the final, inevitable event if recursive training is left unchecked. So how do we keep it checked?

## Is This Actually Fixable?

Labelling collapse as “inevitable” was my doomsday persona coming out. While model collapse is a significant risk, active mitigation can get things under control. There are of course blockers to be considered. Labs are racing against each other to produce the best model. Slowing down to mitigate “model erosion” will hold them back but while the goal of both labs and a Model Collapse Prevention Squad is to produce good models, the uncomfortable truth is that no lab is individually rewarded for protecting the shared data pool. Scraping everything now and worrying about contamination later is the rational move for any competitive player despite it degrading the commons they all draw from. This is exactly why erosion continues despite everyone agreeing that it is bad.

### What We Can Do

Here are some ideas for what we can do:

- Implement AI Governance Tools: I wasn't just joking when I referred to a "Model Collapse Prevention Squad." A governing body that enforces data quality standards, monitors, validates and controls data flow into training pipelines and identifies synthetic data in training sets would be like a firewall and the body can ensure that models remain resilient.
- While evaluation is a sensitive topic for me, benchmarks for AI-generated outputs should be established and models evaluated against the same. The evaluation should encompass checks for hallucinated or unverifiable data, presence of bias, and human rated output quality.
- Encourage people to write: Writing is an outlet. It lets people be creative and AI can be leveraged to close any language gaps while retaining the original script. Not only does this allow people to learn and spend time more effectively than doomscrolling but also provides us with the varied, enriched data that will improve model outputs.
- If synthetic data is unavoidable, we should ensure that it is properly validated and derived from accurate, domain-specific examples embedded in real world facts.
- Most important of all is Data Provenance. Provenance refers to the origin of something, and data provenance means knowing where each data point comes from, if it is AI-generated, where it came from and so on. The importance of Data Provenance and the nuance behind it warrants its own section.

## Data Provenance And Why It Matters Beyond Collapse

Every artifact available on the internet has some metadata associated with it. For example, take a look at this sample from the metadata of an interesting article I read on Springer:

```json
{
  "status": "ok",
  "message-type": "work",
  "message-version": "1.0.0",
  "message": {
    …
      "date-time": "2026-08-19T16:28:55Z",
      "timestamp": 1787156935116,
      "version": "build-2736575974"
    },
    "reference-count": 64,
    "publisher": "Springer Science and Business Media LLC",
    …
    ],
    "DOI": "10.1038/s41586-026-10917-6",
    "type": "journal-article",
    …
    "title": [
      "The HydroGym reinforcement learning platform for fluid dynamics"
    ],
    "prefix": "10.1038",
....
```

Access full metadata here: https://api.crossref.org/works/10.1038/s41586-026-10917-6

This article was published as late as 19th August 2026 and nowhere does it include classification of the article as AI-generated or human-written. This unfortunately holds true across all published content on the web because the metadata layer of the internet wasn't designed to track whether content was created by a person or a machine. It is high time that we design a robust data provenance infrastructure. Aside from the usual information, it should also include information of where the data came from, that is whether it was generated by AI or written by humans. We should be able to determine if the data has been through a model already.

Apart from preventing model degradation, I see one other benefit of data provenance that is very important to me. This will diverge from Model Collapse a little. I have always been wary of deepfakes and the harm they could cause. There have already been many cases of scams and blackmail using deepfakes and AI generated content. But if each output is tagged with a publicly accessible record of it being generated vs. original, date of generation, etc. then we could curb a lot of the prevalent issues and prevent frauds associated with the same. The logistics of that are something I think about frequently and welcome discussion on the same.

## Closing

We have made incredible advances both in AI as well as with the help of AI. We have intelligent agents we can outsource more menial tasks to, AI has begun genuinely solving open Erdős problems including finding a counterexample to a conjecture Erdős himself made in 1946 and defended for eighty years and has made significant advancements in protein folding. I believe we can now rein in the race towards superintelligence and focus on ensuring that AI is safe and beneficial, as well as controllable.

The foundation of AI is data and its problem solving capabilities are directly related to human creativity and grit. If we don't mitigate the erosion now, it will not matter how tall or pretty the mountain is, a landslide is imminent.

---

### [NOTE]

On August 14, 2026, Anthropic announced that future Claude models will generate text containing a watermark as an identifier for the text being written by Claude. This was triggered by the EU AI Act but as of now there is no universal standard and there are ways of stripping watermarks. Additionally, output from older models will not contain the watermark at all and I am unsure if watermarked text will be disqualified from training data. It is a fairly recent introduction and I am looking forward to experimenting with it and seeing how it works out. You can read more about it [here](https://www.anthropic.com/news/claude-text-watermark).
