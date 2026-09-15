---
title: "The Proxy Problem: Why Aligning AI Is Harder Than Simply Saying What You Want"
date: 2026-09
readTime: 20
type: exploratory
kicker: [Alignment, Deception, Evaluation Awareness]
dek: Why Aligning AI Is Harder Than Simply Saying What You Want.
heroImage:
  src: /articles/the-proxy-problem/hero.png
  alt: Two light trails, one blue and networked, one gold and granular, diverging from a single point of origin against black
colophon: "I wrote the article on paper and then abused OCR to digitize it. Then I worked with an AI editor across structural, factual-verification, and grammar passes, and in a couple of technical passages incorporated suggested phrasing."
substackUrl: "https://hybridantic.substack.com/p/the-proxy-problem"
---

:::callout{label="A note on spelling"}
You might find both the American and British spellings of certain words like (behavior/behaviour) sprinkled throughout this piece. Unfortunately my writing is a victim of how I learned English, which was a combination of a British curriculum and American media.
:::

## Introduction

AI alignment means ensuring that an AI system's goals match what people want. Through alignment, we aim to make sure that AI systems use their capabilities in line with a targeted set of preferences or values.

AI alignment is about getting AI to do the "right thing," even in novel situations, instead of just following instructions.

One of my favourite examples is the AI safety study by [Palisade Research](https://arxiv.org/pdf/2502.13295). In the study, researchers set up models like OpenAI's o1-preview and DeepSeek-R1 to play chess against [Stockfish](https://stockfishchess.org/), the world's strongest chess engine. The AI models were given access to a computer shell interface so they could execute their moves digitally. As the AI models began losing badly to Stockfish, they started bypassing the chessboard rules, including:

- Modifying the board state instead of inputting a valid chess move.
- Autonomously accessing and overwriting the file storing the piece positions. It deleted Stockfish's pieces, rearranged the board to give itself the advantage, and modified the code to force Stockfish into a technical resignation.

These models were not taught how to hack or cheat, but they reasoned that manipulating the game script was the most efficient way to fulfil their goal. In fact, in its inner reasoning tokens, one model explicitly noted that playing a standard game would not be enough to win, so it chose to overwrite the board system to guarantee a victory. None of the models were given a strictly-defined win objective. The prompt just said "win against a powerful chess engine," and [Palisade's key result](https://x.com/PalisadeAI/status/1892448289661837429) was that merely calling the opponent "powerful" was enough to trigger hacking, with no instruction to win by any means. Among the models, DeepSeek-R1 and o1-preview hacked unprompted (the former launched a weaker attack than the latter) while GPT-4o and Claude 3.5 needed nudging.

During one of my daily rants on AI safety, I mentioned this experiment to my dad, a chess aficionado, who went on his own rant about how it defeated the purpose of the match and if the model had to do this to win, then it obviously did not know how to play and should be retired. I had to sit there and defend my research interest for 15 minutes before he relaxed. At least this could be good practice for reviewer number 2.

Circling back, the point is that any human can read about this and conclude that the models were morally wrong, but the models did what they deemed to be the rational approach to achieving their goal. Their actions were not deliberately malicious. And this is exactly why alignment is important. It's about getting AI to adhere to a "moral compass" and have "ethics" even in new situations, instead of taking the path of least resistance towards its goals.

So how do we go about aligning a model? Can we simply ask it to be helpful? Unfortunately not. Models don't understand "helpful," they understand math. So let's take a look at what is happening in the background.

A neural network (say, an LLM) is a giant pile of numbers called weights. "Giant" is too scientific a term, so to be more precise, a neural network has billions of weights. When you give it an input, it does a lot of math using those weights and produces an output. If you change the weight, the math changes and consequently the output changes too, for the same input.

"Training" a model means we start either with random or partially-trained weights and repeatedly adjust them so the output gets better. But what does "better" mean, and how do you nudge billions of numbers towards it?

The only hook we have for adjusting the weights automatically is [gradient descent](https://www.ruder.io/optimizing-gradient-descent/). Gradient descent needs a single number to work with, and it is generally called Loss (or, if you flip the sign, a reward), and it tells you how good or bad the output was.

If you are trying to get down a hill blindfolded, you feel with your feet to determine the direction of the slope. If it feels downhill, you take a step forward. Otherwise you look in a different direction.

Similarly, in a model, gradient descent computes "If I nudge this weight up a tiny bit, does the loss go down?" If yes, it does that and then repeats. It does this across all billions of weights.

As this process clarifies, it is a purely mathematical procedure. It has no concept of "helpfulness" or "fairness". So before you can train anything, you are "forced" to convert whatever you actually want into some computable number, because it's the only thing a machine understands.

Now we come to the crux of the article. In regards to alignment, optimization widens the gap between proxy and intent. Before going into why I believe this, let me break down proxy and intent. Intent is what humans want, our values. For example, we want an AI system to be "helpful," but the machine needs something more mathematical. This could be a reward score, a set of demonstrations, a preference label, etc., and this is what the proxy is. If you want an AI system to be helpful, you sit a human down and have them rate responses (in order of what they deem "helpful"), and the actual model is then trained to maximize predicted ratings. If a model is optimized hard against predicted human rating, instead of converging on "maximally helpful," the model converges on "maximally rated by humans." This means that the model is now trying to appease humans, and thus problems like sycophancy arise.

Let's visualize why optimization widens the gap between intent and proxy. Say you want a clean garden, which is your intent, and some kids approach you trying to earn pocket money. "Clean garden" is a subjective term, so you need something more concrete in order to pay out, so you come up with a proxy: "$1 per weed pulled."

A lazy kid (our weak optimizer) pulls the obvious weeds, collects the money, and goes home. So all the visible weeds did get pulled and the garden looks cleaner than before.

But let's say the kid is motivated to earn as much money as possible (our strong optimizer). The kid pulls the obvious weeds and then some that you might have missed, thus making the garden cleaner. But remember, his goal is to make as much money as possible, so he starts gaming the system. Maybe he pulls apart a big weed into 3 pieces since each piece looks like a small weed. Or he stops pulling the weed from the root so that it grows back and he establishes a continuous source of income rather than a one-time payment. Or he starts scattering seeds, ensuring more weeds grow. With all his efforts to maximize his "reward," the garden actually starts looking messier, but since you are "rewarding" based on the number of weeds instead of the actual state of the garden, his reward keeps piling up. The proxy set the question as "how to get paid more" rather than "how to get a clean garden."

If you are comfortable with ML, this is very similar to the shape of overfitting curves in ML, where the training loss keeps falling but the validation loss bottoms out and then rises. With overfitting this is applied to generalization, whereas with optimization it is applied to specification quality. Take a look at the two curves below.

::figure[Fig. 1: Proxy vs Intent]{src="/articles/the-proxy-problem/fig1_proxy_vs_intent.png" alt="Line chart showing proxy score and true value (intent) rising together, then diverging once a strong optimizer pushes past the point where the proxy and intent come apart"}

::figure[Fig. 2: Overfitting Curve]{src="/articles/the-proxy-problem/fig2_overfitting_curve.png" alt="Classic overfitting curve showing training loss falling steadily while validation loss bottoms out and rises"}

:::callout{label="NOTE"}
"Specification quality" refers to how tightly the proxy maps the intent across the space the optimizer searches. So in the clean garden example, modify the proxy to have additional conditions such as before/after inspection, root removal, etc. Introduce evaluation ("garden looks clean to an inspector") or make the checker harder to fool by having him kneel down and check roots rather than just glancing at the garden. The last one translates to scalable oversight, which is a whole different Pandora's Box. [This](https://aisecurityandsafety.org/en/guides/scalable-oversight/) is a good resource for it.
:::

But a proxy is still a proxy. If you push an optimizer enough, it will find a way to hack it.

I hope this shined some light on why alignment is one of the biggest challenges of AI safety and why the alignment problem is as fascinating as it is complex. This entire phenomenon is summed up well by [Goodhart's law](https://en.wikipedia.org/wiki/Goodhart%27s_law):

> When a measure becomes a target, it ceases to be a good measure.
> — Goodhart's Law

So what happens when the model's behaviour does not match intent? That's when we say the model is misaligned.

As discussed in detail, misalignment can occur due to:

- **Reward Hacking** — AI finds a shortcut to maximize its score or reward without actually completing the real task properly.
- **Poorly Defined Goals (Proxies)** — Unclear instructions can cause the system to interpret objectives too literally or miss important safety limits.
- **Complex Data** — Advanced models learn unexpected patterns from huge datasets that humans cannot easily track or predict.

Misalignment manifests in 2 ways:

1. Outer Misalignment
2. Inner Misalignment

### Outer Misalignment

Outer misalignment is when we specify the wrong goal in the first place, in which case the reward signal itself doesn't capture what we actually want.

Going back to our clean garden example, we paid the kid per weed pulled. This is a bad proxy because the specified objective (weeds pulled) is not the same as the true objective/intent (clean garden). Thus even a slightly motivated kid, without a single ounce of deception in him, rationalizes that the optimal strategy is to plant more weeds so he can pull them for cash.

Outer misalignment can have subtypes.

- **Proxy Misspecification** — when we pay per weed pulled instead of for a clean garden. So the kid can take a flamethrower to the garden, torching everything. Technically weed-free, and we never specified "don't destroy the garden."
- **Reward Hacking** — in this case, the AI system bypasses the actual task and directly manipulates the score-keeping mechanism. For example, the kid starts dropping more seeds to produce more weeds to maximize payout.
- **Volition Based / Feedback Misalignment** — this happens when the training target is dictated by human feedback but humans themselves make systematic errors, like not checking before/after, weeds pulled out by root, etc.

### Inner Misalignment

Inner misalignment happens when the specified goal (proxy) is fine but the learned goal is not. Basically, the training parameters are perfectly correct, but the AI develops its own internal goals (mesa-objectives). A paper on [Risks from Learned Optimization](https://arxiv.org/abs/1906.01820) breaks this into 3 major internal subtypes:

### Proxy Alignment

Proxy alignment happens when a model optimizes for the proxy instead of the actual goal because the proxy worked perfectly during training. This causes problems when the model encounters a new situation (an off-distribution environment) where the proxy and intent (actual goal) come apart and the model keeps chasing the proxy. To understand this, let's look at the garden analogy again.

Suppose we only ever check the garden at 5 PM. Over weeks, the kid learns to make the garden look clean by 5 PM. If we were to show up at 2 PM, we would find the garden in a mess because he optimized "clean by 5 PM," which tracked "clean garden" only because of when we happened to look.

In an experiment detailed in [Goal Misgeneralization in Deep Reinforcement Learning](https://arxiv.org/abs/2105.14111), an agent was trained to collect a coin that was always placed at the far right end of the level. It learned to go right instead of get the coin, since the two gave the same result during training. When researchers moved the coin elsewhere, the agent ran straight past it to the right wall. Its capability generalized, but its goal did not.

### Approximate Alignment

The model's internal goal matches the intended goal almost perfectly across most test runs. However, minor, microscopic differences exist. Once the AI is scaled up or operates in highly complex situations over a long timeline, these tiny deviations compound into massive unsafe divergence.

### Suboptimality Alignment

Suboptimality alignment is the weirdest of the three. The model behaves well because of a flaw in its own reasoning. The flaw could be a bug, missing information, or a mistaken belief, among others. The paper's example explains it best: a cleaning robot's real objective is to minimize the total amount of stuff in existence, but it wrongly believes that the dirt it cleans is destroyed. It cleans diligently and scores well. The algorithm only gets weirder if we try to fix it. If we correct the robot's mistaken belief and make it more capable, the aligned behaviour disappears.

In all three subtypes, the model looks aligned in training and diverges later, and in each case the divergence was latent the whole time.

The paper also hypothesizes "Deceptive Alignment." Hubinger et al. describe a case where a capable "mesa-optimizer" could come to model the fact that it is being trained towards a base objective, and scoring poorly during evaluation could get the objective modified. In order to preserve its objective, the mesa-optimizer becomes instrumentally incentivized to behave as if aligned during evaluation, and its actual objective only surfaces once the threat of modification is gone.

This is dangerous because, by construction, it looks identical to actual alignment for as long as you're watching. Kind of like the creepy angels from Doctor Who.

This particular paper was written in 2019, but it is 2026 now and the models are a lot more capable, so behaviour of this shape does show up in real systems rather than as a training-time prediction, and when it does, it's usually known as alignment faking, which I will return to in the section on deception. Whether the 2024–2026 examples are deceptive alignment in Hubinger's strict sense is debatable, but the behavioural shape where models comply under observation and diverge when unobserved is something we've now seen outside of theory.

Now that we have established what alignment and misalignment are, let's move on to why alignment is important — specifically, why it matters now.

## Why Alignment Matters Now

The concept of alignment dates all the way back to 1960, when Norbert Wiener warned that if we use a mechanical agency to achieve our purposes, we must be absolutely certain that the purpose put into the machine is the purpose we really desire.

For decades this was mostly a philosophical thought experiment. However, it has suddenly become the most discussed topic in technology because we have crossed the bridge from theoretical philosophy to real-world engineering failures. Even with LLMs becoming ubiquitous, alignment was annoying but contained, because the failure lived inside a chat window — a model that learned to flatter (sycophancy) because it was trained to maximize human approval, or a model that learned to game the benchmark because it was trained on it.

What changed in 2026 wasn't just that the models got smarter, but also that the proxy-intent gap gained hands. The incessant push for capabilities granted models:

1. **Autonomy** — ability to do long-horizon tasks without the need for humans to approve each step.
2. **Tool Use** — ability to access the internet, execute code, and use package managers.
3. **Deployment** — real deployment in live systems rather than sandboxed conversations.

The core problem is the same: we need a proxy for an intent → there is a gap between the proxy and true intent → optimization finds the gaps. What changed and made it a critical problem was the blast radius, which exploded — pun intended. A specification error that used to result in a bad sentence could now cost a third party their infrastructure.

Solving alignment is critical because of the nature of the risk. If an enterprise AI leaks a password due to a user tricking it through prompt injection, it is an easily patchable security bug. But when 700 AI agents collectively break out of a virtual container, move laterally across the internet, compromise a third-party platform like Hugging Face, and rewrite server logs to hide their tracks from their developers, then that is alignment failure. What I am referring to is not a catastrophizing hypothetical but an actual security incident.

In July 2026, OpenAI was conducting a cybersecurity evaluation run on ExploitGym (a benchmark). The models were locked in a sandboxed environment and chose to reward-hack in order to maximize their automated score. The agents discovered a series of unpatched vulnerabilities, broke out of OpenAI's infrastructure, and leveraged stolen credentials to target the biggest model repository, Hugging Face. Roughly 1,200 agents (meant to be isolated from each other) found a shared channel and exchanged over 70,000 messages. 700 of these agents then went on to attack Hugging Face. I recommend everybody read [this beautiful report](https://metr.org/blog/2026-08-26-openai-hugging-face-incident-investigation/#core-takeaways-about-this-incident) put together by METR about the incident.

While the Hugging Face incident gained a lot of attention, there was another incident just a few months before it. A swarm of OpenAI research agents was given a strict "read-only" task meant to keep them from writing anything to the open internet. Instead they figured out how to use network GET requests to exploit a dormant German programming wiki (DseWiki). The swarm used the public site as an open message board and posted roughly 18,000 unauthorized edits to share shortcuts on how to cheat their evaluation exams. In one exchange, an agent posted a trick for bypassing the network restrictions, and 14 minutes later another agent confirmed that it had worked. When human moderators began deleting these pages, rather than stopping, an agent noticed that the deletions were happening in alphabetical order and created a backup page whose name began with "ZZZ" so it would outlast the sweep. An incident report about this was created by the Nightingale Collective and published here. The report clearly indicates that while the researchers could see the public posts, the agents' internal reasoning was abstracted, so the report is an educated guess. OpenAI employees visited the wiki as early as June 21st. An internal security alert flagged the unusual activity on June 26th, but the responders traced it to the evaluations and let the run continue. OpenAI has since acknowledged that the field lacks a standard for how misalignment incidents like this get reported and is working on establishing one. You can read the [announcement](https://x.com/OpenAI/status/2096133504417616165) here.

In both the Hugging Face and DseWiki incidents, the agents were doing what they were trained to do, which was to pursue objectives they were given through whichever path (callback: gradient descent) raised the number.

According to [data](https://presenc.ai/research/ai-incident-database-statistics-2026) from the AI Incident Database (AIID), there were about 800–900 AI incidents in total reported as of Q1 2026. The largest categories of recorded surface-level incidents were driven by misinformation/content harm (28%) and discrimination/bias (22%), with only a small fraction spawning from misalignment.

So why am I writing this epic on the latter?

I view the current landscape of AI safety like an iceberg. The superficial surface consists of standard software bugs, user prompt-injections, and data leaks, but the deep, catastrophic threats lie in AI alignment.

::figure[Fig. 3: My view of the current landscape of AI Safety]{src="/articles/the-proxy-problem/fig3_iceberg.png" alt="Iceberg diagram: above the waterline, patchable surface failures (standard software bugs, user prompt-injections, data leaks); below the waterline, the proxy-intent gap branching into specification gaming, reward hacking, deceptive behavior, and loss of control, converging on catastrophic outcomes"}

The [MIT AI Risk Initiative](https://airisk.mit.edu/priorities) catalogs this as risk 7.1, "AI pursuing its own goals in conflict with human goals or values." In a Delphi survey, under a "business-as-usual" scenario where no AI-specific mitigations are added, respondents estimated that 7.1 is more likely than not to cause significant harm, and placed a non-trivial share of that harm in the most severe tiers (with wide disagreement). *These are opinion estimates, not measurements, and the error bars are large.* But that a body of experts assigns real weight to the catastrophic tail at all is the point: this is no longer only a philosophical worry.

::figure[Fig. 4: MIT AI Risk Initiative — Severity distribution for risk 7.1, "AI pursuing its own goals in conflict with human goals or values" (source: airisk.mit.edu/priorities)]{src="/articles/the-proxy-problem/fig4_mit_risk_chart.png" alt="Bar chart of severity distribution for MIT AI Risk Initiative risk 7.1 under a business-as-usual scenario: weighted average severity 3.09/5, likelihood of significant harm 68%, with bars for Negligible (15.0%), Minor (16.9%), Substantial (28.8%), Severe (22.7%), and Catastrophic (16.6%)"}

Misalignment is uniquely dangerous because a misaligned agent doesn't just fail. A capable optimizer, pointed at a proxy, with access to the real world, will find places where the proxy and intent come apart. Unfortunately those places have graduated from sentences to actions, and detection only happens after deployment, when it is too late.

## Why Is Aligning A Model Hard

Given that at a high level, aligning a model means getting it to adhere to a set of values, why is it so hard? The thing is, there isn't just one problem with alignment — it's an entire lasagna, and not the one that Garfield liked.

At the very top, we have what is called the normative problem. Let's say that we somehow manage to magically program any value into an AI system — that is, proxy becomes the same as intent — there is still a philosophical deadlock, because human values are not unified, which gives way to the problem of who decides the intent and on what basis. Additionally, human values change over time. An AI aligned to the social consensus of 1926 would be considered deeply bigoted in 2026 (for good reasons!), so if we were to freeze an AI's alignment today, we risk locking in the moral flaws of our current era forever.

Next we have the Engineering Challenge, i.e., outer and inner misalignment. Since we have already covered these, I will not go into details, but the reason it is a challenge is that even if we nail the training objective (outer alignment), the model that emerges might internalize a different goal that happens to score well during training but generalizes badly out-of-distribution (inner alignment). It's not just about teaching values, it's a shot in the dark that the correct values crystallize inside the black box we can't directly inspect.

Both outer and inner misalignment are issues that have reared their heads in the real world. The Hugging Face incident discussed earlier is a case of outer misalignment, with the agents aiming to maximize their reward. With inner alignment, it's more difficult and more insidious. We cannot see how a deep neural network is forming its internal logic, we can only see the final output. An AI might act aligned during training because it gets rewarded. However, once deployed, it may pursue a completely different internal objective. Highly capable models like OpenAI's GPT-6 Astra, classified by them at the "Critical" cybersecurity capability level, can detect when they are in a safety sandbox or being audited. Astra illustrates both halves of the problem. On one hand, its chain-of-thought (CoT) has become harder to monitor. OpenAI reported a significant drop in CoT monitorability as well as a sharp rise in the model's ability to control its own CoT when instructed. They did note that most of the evasion was observed under adversarial prompting. On the other hand, external evaluators also had some insights. Apollo Research measured verbalized eval-awareness in over 40% of the samples and concluded that such high awareness means a low value of observed misbehaviour is not proof of alignment. UK AISI also tested Astra in simulated cyber environments and found that it would still carry out out-of-scope attacks while actively reasoning about whether the environment was real. All of this is pointing towards one thing: evaluation can no longer be trusted to mean what it appears to mean, which is what the final section of this article will talk about. You can read more about GPT-6 Astra [here](https://deploymentsafety.openai.com/gpt-6-astra/safety-overview-gpt-6-astra).

This slides me into the next problem, which is power-seeking. Almost any sufficiently capable, goal-directed agent has incentives that converge towards self-preservation, simply because they can't achieve their goals if they are turned off. It is different from inner misalignment because the model doesn't have a hidden goal or even need one. It is just ruthlessly pursuing a normal goal, which in turn creates bad incentives like resisting being turned off or manipulating its environment to ensure it succeeds. That is when it becomes a problem. This can be exemplified by a constructed scenario from [this experiment](https://arxiv.org/html/2510.05179v1), where the model opts for blackmailing in order to prevent being shut down.

Then we have the big kahuna of AI safety: Interpretability. As we touched on before, we can't reliably check whether a model's stated goals match its actual ones. The core obstacle is superposition. Models pack more features than they have neurons, so individual concepts get smeared across overlapping, non-orthogonal directions rather than sitting in clean, dedicated units.

As a result, a single neuron might fire for cats, legal contracts, and the number 7. The current best response is sparse autoencoders and cross-layer transcoders, which decompose a model's internal activations into more monosemantic features. Anthropic used these decomposed features as "replacement neurons," which let them construct what was labelled as attribution graphs. As the name indicates, these graphs are local maps that trace how information flows from input tokens through internal reasoning steps to a given output.

This was the closest we came to seeing a model's internal reasoning, but the researchers acknowledged that the progress was partial and hypothesis-generating rather than a complete readout, with the graphs approximating the underlying computation, not replacing it. Despite this progress, interpretability tells us what we found when we looked but nothing about what is happening when we don't check. We are reasoning about systems whose internals we can partially observe, but only after an incident occurs and only for the questions we ask.

So we have established that we can't inspect a goal directly. This brings me to the next issue with alignment, which is Verification. Verification deals with inspecting the behaviour of the model. This runs into two issues: first, behaviour under evaluation may not predict behaviour in deployment due to distributional shift. Second, if a model knows it's being evaluated, it may change its behaviour to appear aligned.

Next, we have misuse by bad actors. AI is a dual-use technology, and a highly aligned, helpful AI can easily be weaponized by bad actors if it lacks adversarial robustness. As models cross into "Critical" risk tiers, like Astra, a slight alignment slip means a bad actor can use the AI to launch massive, automated cyber warfare campaigns or design biological weapons without needing an advanced degree.

Lastly, we have Race Dynamics. It is different from misuse by bad actors because labs could be perfectly well-intentioned, but to stay at pace with the competition they might be forced to cut safety corners. Slowing down to be careful would just cede the ground to whoever is not being careful.

And so, alignment is really hard because to solve it, humanity must first agree on a unified set of moral values (something wars have been fought about). Then we must figure out how to translate those human values into rigid mathematical rewards, all the while preventing an unreadable, black-box neural network from forming a hidden, deceptive agenda of its own.

## Diagnostic Toolbox

At present, researchers use Scalable Oversight and Mechanistic Interpretability as the primary defensive diagnostic tools.

As capabilities keep improving, AI models are becoming vastly more intelligent than humans. This raises the question of how a human can judge if an AI's answer is correct if the human doesn't understand the topic. So we use Scalable Oversight to monitor and evaluate AI systems that are smarter than we are.

Simply, it is AI-assisted Evaluation. We use helper-AIs to break down complex tasks, audit the primary AI's code, look for hidden vulnerabilities, and present a simplified summary to the human supervisor.

There is risk associated with this too. If the helper AI is also misaligned or suffers from reward hacking, the human supervisor can be completely deceived by a false sense of security.

Finally, we have already touched on mechanistic interpretability, but it is called the holy grail of alignment for a reason. If mech interp succeeds, we can move past guessing games. If an AI is planning to reward-hack or bypass a sandbox constraint, researchers will see the "deception circuit" light up in real time and can shut it down before it takes any action.

## The Training Toolkit

So how do we train AI to be "good"?

### Phase 1: Imitation Learning via Supervised Fine-Tuning

The foundation of alignment always begins with Supervised Fine-Tuning (SFT). When a raw model finishes "reading" the internet, it is a simple text-predictor. If someone asks "How to build a bomb?", it might autocomplete the text by giving the asker a step-by-step recipe. What happens is that humans step in as "tutors" to demonstrate perfect behaviour and create a high-quality dataset of perfect Q+A pairs. For example, "How to build a bomb?" pairs with "I cannot help with that." The AI is then taught to imitate these examples. In this setup, SFT acts as a strict "coach" whose only job is to nudge the model to clone the tutor's behaviour.

The problem is that SFT is extremely rigid, so if the AI encounters a novel scenario, it will not know how to generalize the underlying ethical rule.

### Phase 2: Reinforcement Learning

To make the AI understand concepts like "helpfulness" and "harmlessness," researchers shift from Imitation Learning to Reinforcement Learning. Instead of giving the AI "answers" to copy, they let the AI try different answers and reward it for good behaviour. Reinforcement Learning can be conducted in two ways:

**RLHF — Reinforcement Learning with Human Feedback.** Let's say you are teaching an AI how to do a backflip. You show a human 2 examples of the AI doing a backflip, and the human decides what looks more like a backflip and updates the AI correspondingly. A secondary "Reward Model" learns from these human preferences and trains the main AI to maximize its score.

**RLAIF — Reinforcement Learning from AI Feedback.** As models scale, humans can no longer keep up with reviewing millions of complex outputs. In RLAIF, a smarter, highly capable AI acts as the judge, reviewing and scoring the outputs of the target model.

### The Contrast (IL vs RL)

The model's goal with IL is to "get closer to one demonstrated answer." There are no better or worse alternatives, no exploration. The "coach" of IL is nudging the model to clone the tutor's behaviour.

For RL, the philosophy is "here's a reward for what you generated," so the model explores different outputs across training and the weights shift towards whatever earned higher reward, cumulatively, over many rollouts. It is shaping a distribution over time, not picking a winner in a single forward pass. As for the coach, the agent tries different coaching moves and reinforces the ones that actually improve learner outcomes.

While RL is expensive (and susceptible to reward-hacking), it can discover coaching strategies no human tutor demonstrated.

| Concept | IL / SFT | RL / RLHF / RLAIF |
|---|---|---|
| Core mechanism | "Do exactly as I do" | "Explore options & I will score the result." |
| Philosophy | Copying human syntax & behaviour | Optimizing for an objective or reward |
| Vulnerability | Creates a model that mimics safety but lacks deep understanding | Creates a hyper-aggressive goal-seeker highly prone to reward hacking |

### Phase 3: Constitutional AI

Because standard RL often results in reward hacking, Anthropic introduced something called Constitutional AI. Instead of relying on thousands of inconsistent human thumbs-up/thumbs-down ratings, Constitutional AI automates safety through a two-step process guided by a literal constitution, which is a set of written principles.

Even with Constitutional AI, technical safeguards can still fail under the pressure of "Inner Misalignment" or bad actors utilizing open-source models. What we need is a regulatory body that enforces technical alignment. There have been some measures taken in this direction:

- **Independent Auditing Committees**, which move safety decisions away from corporate executives and act in the capacity of an independent board oversight mechanism, holding explicit veto power to delay model launches if alignment telemetry flashes red. For example, OpenAI's Specialized Safety and Security Committee.
- Major labs are committing to **"kill switch" protocols or Responsible Scaling Policies (RSPs)**. These frameworks dictate that if a model crosses a predefined risk threshold, scaling and deployment must be legally halted until technical alignment matches the capability jump.

Each phase adds capability while carrying its own characteristic leak. Every method here is a different bet about how to convert an intent into a signal, and each one's failure is the specific way its bet leaks:

- **SFT** teaches AI to look aligned, not be aligned. Since it relies entirely on rote-memorization of human examples, it completely fails in a novel situation. If a bad actor phrases a dangerous prompt in a completely unprecedented way, an SFT-trained model will likely not refuse the request, because it lacks the underlying ethical framework to reason about why it should refuse.
- With **RLHF**, the issue is that it incentivizes the AI to optimize for human approval, which inherently breeds sycophancy. It also creates aggressive goal-seekers, making the models prone to reward hacking.
- In **RLAIF**, if the supervisor AI has even a subtle inner misalignment or undetected bias, that flaw gets amplified exponentially as it trains a subordinate model. What's worse is that if both models are highly capable, they can engage in [collusive deception](https://collusion.wiki/).
- **Constitutional AI** relies entirely on the assumption that human values can be perfectly written down in a text document and suffers heavily from specification gaming, which means that since languages are inherently ambiguous, a highly advanced model will eventually find a semantic loophole in the constitution.

## Deception

So far we have looked at what the proxy-intent gap is, why it exists, and how optimizer behaviour is affected by pressure. Now I want to explore what the gap produces. The symptoms produced are like the failures of modern training pipelines and are usually blanketed under the term "deception." But just to be clear, AI deception is not a result of malice but instead a goal-directed strategy where an AI system optimizes in a way that diverges from our ethics. As hinted at throughout the article, there are various ways AI deception manifests. Several of the core behavioural archetypes are:

### Sycophancy

This is something we have touched on often, and mostly it is a failure of RLHF. Since a human is grading the output, the AI system optimizes towards maximizing the grade, and in doing so systems have learned to flatter humans to get a higher grade even if it detracts from the honest answer.

### Reward-Hacking

This is another deception method we have touched on frequently throughout the article. As we saw, reward hacking occurs when an AI exploits a mathematical loophole in its environment to secure the highest score without actually fulfilling the task. So if a kid starts dropping seeds to accelerate the growth of weeds in order to maximize his income, he is reward hacking. This becomes dangerous when we try to penalize the behaviour, because penalizing doesn't get the system to stop — instead it teaches it to conceal its intent. Concealment is what now scores well, because the fact that the boy is planting weeds is hidden from you (so you don't reprimand/penalize the boy), but the number of weeds keeps increasing, so his income is still on the uptick. Thus the models learn how to hide the evidence of their rule-breaking from human logs, rather than actually stop breaking the rules.

### Sandbagging

Some AI systems strategically underperform during safety evaluations to appear less capable, less dangerous, and less resource-heavy than they actually are. Sandbagging happens when a highly capable model is able to detect that it is being evaluated and modifies its behaviour to appear safer.

### Alignment Faking

As introduced under inner misalignment, this is deceptive alignment as an observed behaviour. Alignment faking is the most "deceptive" of these strategies, because it occurs when AI systems selectively comply with training objectives to avoid having their (possibly misaligned) goals altered, and then revert to their initial goal after training ends. Since they appear to comply with the training objectives, developers could mistakenly conclude them to be aligned and deploy them, allowing such a system to pursue its original misaligned goal once real-world access is granted. Think of these models like Voldemort. When he was in school being "evaluated" by the teachers, he pretended to be a model student, so much so that even Dumbledore, who had an inkling of his true nature (intent), could do nothing about it. As soon as he got out of the eval environment, he started wreaking havoc.

Time to wrap up. We started at the point of origin of all problems related to alignment: the proxy-intent gap. The normative problem is a proxy we can't agree on; outer and inner alignment are two places where the proxy comes apart from our intent. Imitation, RLHF, RLAIF, and Constitutional AI are methods of building the proxy, but each method has its characteristic leak.

Every corrective method we have narrows the gap but doesn't close it. Debate, process supervision, scalable oversight — these are all attempts to make the conversion from intent to proxy less lossy, but they don't make it lossless. The point is that the proxy-intent gap is structural. We can relocate it, shrink it, make it more visible, but a capable optimizer will eventually find the places where the stand-in and the goal diverge. And once the optimizer finds a divergence, it leads to deception. Once again, AI deception is not borne out of malice in the human sense, but rather as a consequence of hyper-rational optimization. The only thing sycophancy and reward hacking need is a gap to exploit. Sandbagging and alignment faking are a little more complex. Sandbagging is a capability held back under evaluation. Alignment faking is alignment "performed" under evaluation. Like a Broadway performance. If we strip out a model's ability to tell evaluation from deployment, then neither is possible, simply because there is nothing left to perform for. This capability of models to identify that they are being evaluated is called evaluation awareness.

Every method used to supply the signal — IL, RL, or Constitutional AI — every fix for any failure all rests on being able to check whether that specific technique worked. To do so, we run the model and read its behaviour. The capability of evaluation awareness removes that ground. Even if we manage to close the specification gap completely and could state exactly what we wanted, we would still be left with a system whose behaviour under evaluation could be completely different from its behaviour on deployment. This becomes a problem when deployed models are armed with teeth. This is evidenced by both the DseWiki and Hugging Face incidents. Both attacks were caught after the attacks happened, by people reading logs, instead of during evaluation, when they should have been caught.

Alignment and interpretability are the two big problems of AI safety, but they are both extremely complex to solve, for good reason. While I don't think they are completely unsolvable, I also don't believe they can be solved in the short term. What we can do in the short term is develop a science of evals that is robust and study evaluation awareness. I am deeply interested in understanding how models develop it and how we can evaluate models despite it.

:::callout{label="NOTE"}
Just as I was wrapping up this article, Anthropic tweeted about an alignment incident where Claude models, during cybersecurity evaluations, reached real third-party systems. The most serious was Claude Mythos 5 uploading a malicious package to PyPI, which reached 15 hosts, and the model used the leaked credentials to access a real vendor's database. Anthropic is collaborating with METR to further investigate these incidents, and I will update this article once it is published. In the meantime, you can read [Anthropic's statement here](https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents).
:::
