# ⚡ NPTEL Prep Master — Applied Accelerated Artificial Intelligence

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-success?style=for-the-badge&logo=github)](https://manidutt.github.io/nptel-applied-accelerated-ai/)
[![Course](https://img.shields.io/badge/NPTEL-IIT%20Guwahati-blue?style=for-the-badge)](https://nptel.ac.in)
[![Questions](https://img.shields.io/badge/Verified%20Questions-150%20MCQs-indigo?style=for-the-badge)](https://manidutt.github.io/nptel-applied-accelerated-ai/)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

> **Official Course:** Applied Accelerated Artificial Intelligence  
> **Offering Institute:** Indian Institute of Technology Guwahati (IIT Guwahati)  
> **Curriculum Coverage:** Weeks 1 to 10 (15 Verified Assignment Questions Per Week = 150 Total)  
> **Live Web Application:** [https://manidutt.github.io/nptel-applied-accelerated-ai/](https://manidutt.github.io/nptel-applied-accelerated-ai/)

---

## 🌟 Overview

**NPTEL Prep Master** is an interactive, modern web application designed for students preparing for the NPTEL *Applied Accelerated Artificial Intelligence* certification examination. It provides randomized quizzes sourced directly from official IIT Guwahati weekly assignments, accompanied by detailed explanations, lecture takeaways, and mathematical formulations.

---

## 🎮 Practice Categories & Modes

- **⚡ Rapid Fire Drill (5 MCQs):** High-tempo 5-question blitz (45s per question) with instant feedback.
- **🎯 General Practice (15 Questions):** Balanced sample drawn across all 10 weeks of the syllabus.
- **🏆 Comprehensive Mock Exam (30 Questions):** 45-minute timed test with a Question Navigation Palette and review flags.
- **📅 Week-Wise Practice (Weeks 1 to 10):** Focus on individual 15-question assignment sets.
- **🏷️ Topic-Wise Concept Tracks:** Thematic drills across Hardware Architecture, Cloud Orchestration, Frameworks, LLMs, and Distributed Training.
- **⚠️ Weak Areas & Mistakes Ledger:** Automatically aggregates previously missed questions for focused revision.
- **📚 Question Bank & Study Hub:** Interactive browser for all 150 questions with live search and flashcard mode.
- **⚙️ Custom Quiz Studio:** Personalize question counts (5 to 50), multi-select weeks, toggle feedback style, and set timers.

---

## 📚 Syllabus & Week Breakdown

| Week | Module Title | Core Topics |
| :---: | :--- | :--- |
| **01** | **Hardware Architecture & Memory Wall** | Memory Wall, DRAM latency, Roofline Model, OoO, ROB, Amdahl's Law, HBM |
| **02** | **Docker, CUDA & GPU Containers** | Docker storage drivers, `nvidia-docker`, CUDA execution hierarchy, PCIe bandwidth |
| **03** | **Kubernetes & Service Mesh Orchestration** | GPU device plugins, StatefulSets, Headless Services, Istio VirtualServices |
| **04** | **PyTorch Deep Learning Acceleration** | `torch.profiler`, DataLoader `pin_memory`, AMP mixed precision, Tensor Cores |
| **05** | **TensorFlow Acceleration & XLA** | XLA JIT compilation, `tf.data` AUTOTUNE, `@tf.function` retracing, input signatures |
| **06** | **LLMs, PEFT & Quantization** | Next-token prediction, AdamW memory footprint, LoRA rank & alpha, Checkpointing |
| **07** | **Distributed Training & Parallelism** | Data Parallelism (DDP), Tensor Parallelism, Ring All-Reduce, NCCL, ZeRO-3 |
| **08** | **Large-Scale Training Dynamics** | Linear LR scaling rule, LR warmup, critical batch size, fault-tolerant checkpointing |
| **09** | **Graph Compilers & vLLM Serving** | `torch.compile`, TorchDynamo, TorchInductor, AOTAutograd, vLLM PagedAttention |
| **10** | **Distributed Data Engineering** | Apache Spark, Dask, Ray, lazy evaluation, data shuffling, DAG lineage |

---

## ⌨️ Keyboard Navigation

- `A`, `B`, `C`, `D` or `1`, `2`, `3`, `4`: Select option
- `Enter` or `→`: Next question
- `←`: Previous question
- `F`: Toggle "Flag for Review"
- `P`: Open / close Question Navigation Palette
- `Esc`: Close open drawers and modals

---

## 🚀 Running Locally

Clone the repository and run locally:

```bash
# Clone repository
git clone https://github.com/Manidutt/nptel-applied-accelerated-ai.git
cd nptel-applied-accelerated-ai

# Option 1: Run with launcher script
./start.sh

# Option 2: Run with Node.js
npm start
# or: node server.js

# Option 3: Run with Python HTTP server
python3 -m http.server 3000
```

Open `http://localhost:3000` or open `index.html` directly in any web browser.

---

## 📄 License

MIT License. Educational preparation materials developed for NPTEL students.
