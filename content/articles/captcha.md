---
title: "CAPTCHA: What Is It and How Does It Work?"
date: 2023-03
readTime: 5
type: exploratory
---

CAPTCHA stands for Completely Automated Public Turing test to tell Computers and Humans Apart. The test is designed to determine whether a user is human or a bot. The original version required users to identify the correct sequence of distorted characters — the assumption being that bots couldn't reliably parse them and would, at best, input a random string, making it statistically unlikely they'd pass. Then ML got better at reading distorted text, and the arms race began.

## What Google reCAPTCHA Actually Does

Google reCAPTCHA is a free service that moved away from distorted text toward more complex verification. Three main variants:

### Image recognition

The most common current form — "select all images containing a traffic light." Fairly intuitive, but also solvable by bots with image recognition models. The defense is using blurry or ambiguous images, which degrades ML accuracy but also degrades user experience. The arms race continues.

### The checkbox

The "I am not a robot" checkbox is not actually verified by the click itself — it's verified by the path the cursor takes approaching the box. Even the most direct human movement contains micro-variations that bots struggle to replicate authentically. If the cursor analysis is inconclusive, the system inspects stored cookies and browsing history. If that's still inconclusive, it falls back to an image challenge.

### Behavioural assessment

The latest version takes a holistic view: the user's history of interacting with web content, browsing patterns, and contextual signals. A score from 0.0 to 1.0 is assigned — closer to 0.0 means more likely to be a bot. If the score is borderline, an additional challenge is presented.

> So yes, reCAPTCHAs do access browsing history. The test is continuous and invisible, not just the moment you click the box.

## The Underlying Problem

Every CAPTCHA advance has eventually been defeated by a corresponding ML advance. The behavioural assessment approach is interesting because it makes the test harder to target directly — you'd need to fake an entire browsing history, not just solve a discrete puzzle. But it also means the verification system has significant visibility into user behaviour as a side effect of doing its job.
