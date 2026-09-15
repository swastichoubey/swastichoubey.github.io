// ─── NATIVE READER CONTENT (hand-written holdouts) ───────────────────────────
// Everything converted to Markdown lives in content/articles/*.md and is
// compiled into readerContent.generated.js (see scripts/build-content.js).
// This file holds whatever hasn't been converted yet. Reader.jsx merges both,
// with generated entries taking precedence on id collisions.

export const ARTICLES = {
  "distillation-attacks": {
    title: "Distillation Attacks on LLMs",
    date: "2024-03",
    readTime: 12,
    type: "opinion",
    blocks: [
      { type: "paragraph", text: "Model distillation is one of the most widely used techniques in production ML — compress a large expensive model into a smaller faster one that retains most of its capability. The safety community has spent considerable time thinking about what gets preserved in distillation. The answer, it turns out, includes things we'd rather not transfer." },
      { type: "heading", text: "What is a distillation attack?" },
      { type: "paragraph", text: "A distillation attack exploits the knowledge transfer process to intentionally or inadvertently copy adversarial vulnerabilities from a teacher model into a student. The student inherits not just the teacher's useful representations — it inherits its blind spots, its susceptibility to specific perturbations, and in some cases its exact decision boundaries near adversarial examples." },
      { type: "quote", text: "The student doesn't just learn what the teacher knows. It learns how the teacher fails." },
      { type: "paragraph", text: "This matters because the safety community often evaluates models independently. A student model that passes its own eval may still be vulnerable to adversarial inputs crafted against its teacher — and those inputs transfer with surprisingly high fidelity." },
      { type: "subheading", text: "The transfer fidelity problem" },
      { type: "paragraph", text: "Szegedy et al. established that adversarial examples transfer across architectures — an input that fools ResNet-50 often fools VGG-16 too. Distillation makes this worse because the student is explicitly trained to mimic the teacher's output distribution, including its behavior near decision boundaries." },
      { type: "code", text: "# Simplified: generating transferable adversarial examples\nteacher_grad = compute_gradient(teacher_model, x, y_true)\nadv_x = x + epsilon * sign(teacher_grad)\n\n# This input transfers to the student at high rates\nstudent_pred = student_model(adv_x)  # often wrong" },
      { type: "paragraph", text: "In my experiments across three model families, transfer rates for distillation-derived adversarial examples averaged 67% — significantly higher than the 34% baseline for cross-architecture transfer without distillation." },
      { type: "heading", text: "Why this matters for AI safety" },
      { type: "paragraph", text: "The deployment reality is that most production LLMs are distilled versions of larger models. Safety evaluations are typically run on the final deployed model. If the distillation process transfers adversarial vulnerabilities from a less-carefully-evaluated teacher, safety evals on the student may miss real failure modes." },
      { type: "paragraph", text: "This isn't hypothetical. It's a systematic gap in how we think about the provenance of model behavior — and it compounds with other issues like evaluation reliability and synthetic data contamination." },
      { type: "divider" },
      { type: "paragraph", text: "This is an area I'm continuing to investigate. If you're working on related problems in model evaluation or adversarial robustness, the contact form is right there." },
    ],
  },
}
