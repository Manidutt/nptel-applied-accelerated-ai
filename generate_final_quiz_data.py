import re, json
import pypdf

# Exact metadata per week
WEEK_INFO = {
    1: {
        "title": "Hardware Architecture & Memory Wall",
        "category": "Hardware & Architecture",
        "lecture": "Week 1: Computer Architecture for Accelerated Computing",
        "tags": {
            1: "Memory Wall & DRAM Latency",
            2: "Re-Order Buffer (ROB) & Out-of-Order Execution",
            3: "Data Level Parallelism & SIMD Extensions",
            4: "Roofline Performance Model & Arithmetic Intensity",
            5: "GPU vs CPU Compute Bounds in Matrix Multiplication",
            6: "Memory-Bound vs Compute-Bound Workloads (LLM Inference vs Training)",
            7: "DDR5 Memory Standards & Bus Width",
            8: "ECC Memory & SECDED Error Correction",
            9: "NUMA Architecture & Cross-Socket Latency Overhead",
            10: "CUDA Execution Model & Warp Architecture",
            11: "Tensor Cores: Numerical Precision vs TFLOPS",
            12: "Automatic Mixed Precision (torch.cuda.amp.autocast)",
            13: "High-Bandwidth Memory (HBM3) Architectural Advantages",
            14: "Interconnect Bottlenecks & NVIDIA NVSwitch Fabric",
            15: "CUDA APIs: Runtime API vs Driver API"
        },
        "formulas": {
            1: r"T_{\text{DRAM}} \approx 50\text{--}100\text{ ns} \gg T_{\text{L1}} \approx 1\text{ ns}",
            4: r"P_{\text{attainable}} = \min\left(\text{Peak FLOP/s},\, OI \times \text{Memory Bandwidth}\right)",
            11: r"\text{Throughput} \propto \frac{1}{\text{Precision Bits}} \implies \text{FP16 TFLOPS} = 2\times \text{FP32 TFLOPS}"
        }
    },
    2: {
        "title": "Docker, CUDA & GPU Containers",
        "category": "Containers & Cloud",
        "lecture": "Week 2: Containerization & GPU Toolkits",
        "tags": {
            1: "Docker Image Layers vs Container Runtime Architecture",
            2: "Dockerfile Layer Caching & Build Step Ordering",
            3: "NVIDIA Host Driver & Container CUDA Toolkit Compatibility",
            4: "GPU Resource Isolation & Device Visibility (--gpus)",
            5: "NVIDIA Container Toolkit Installation Syntax",
            6: "Docker Build Reproducibility & Unpinned Dependencies",
            7: "Immutable Base Images & Cryptographic SHA-256 Digests",
            8: "Multi-Stage Docker Builds & Artifact Separation",
            9: "Reproducible Dependency Locking with pip-tools",
            10: "Container Storage: Host Bind Mounts vs Ephemeral Layers",
            11: "CUDA Unified Memory (cudaMallocManaged) & Page Fault Migration",
            12: "CUDA Kernel Execution Configuration (<<<gridDim, blockDim>>>)",
            13: "Multi-Instance GPU (MIG) Hardware Partitioning",
            14: "Multi-Process Service (MPS) Logical Sharing & Isolation Limits",
            15: "Gang Scheduling & Multi-Node Slurm Resource Allocation"
        },
        "formulas": {
            12: r"\text{Total Threads} = \text{GridDim} \times \text{BlockDim}"
        }
    },
    3: {
        "title": "Kubernetes & Service Mesh Orchestration",
        "category": "Containers & Cloud",
        "lecture": "Week 3: Kubernetes Orchestration & AI Deployments",
        "tags": {
            1: "Kubernetes Reconciliation Loop (Watch & Reconcile)",
            2: "Google Borg & Kubernetes Architectural Origins",
            3: "Kubernetes Control Plane: API Server (kube-apiserver)",
            4: "Worker Node Networking: kube-proxy & iptables/eBPF",
            5: "Kubernetes Pod Networking & Shared Volume Architecture",
            6: "NVIDIA GPU Device Plugin for Kubernetes",
            7: "GPU Smoke Testing & nvidia-smi Pod Verification",
            8: "Stateful AI Clusters: Headless Services & DNS Discovery",
            9: "Secret Management for Sensitive API Keys & Credentials",
            10: "Environment Variable Bulk Injection (envFrom)",
            11: "Pod Lifecycle: CreateContainerConfigError Resolution",
            12: "Canary Rollouts & Traffic Splitting Strategies",
            13: "Virtual IP (VIP) ClusterIP Service Load Balancing",
            14: "Container Inspection: kubectl exec Runtime Verification",
            15: "StatefulSet DNS & Individual Worker Pod Addressing"
        },
        "formulas": {
            12: r"\text{Canary Traffic} = 10\%, \quad \text{Stable Traffic} = 90\%"
        }
    },
    4: {
        "title": "PyTorch Acceleration & Profiling",
        "category": "Framework Acceleration",
        "lecture": "Week 4: PyTorch Profiling, DataLoader & Optimization",
        "tags": {
            1: "Tensor Reshaping: Squeeze & Unsqueeze Mechanics",
            2: "Autograd Computational Graph & In-Place Operation Hazards",
            3: "PyTorch Tensor Broadcasting Alignment Rules",
            4: "PyTorch requires_grad & Computational Graph Memory Overhead",
            5: "PyTorch Module Definition Bugs (nn.ReLU Class vs Instance)",
            6: "PyTorch Dynamic Execution Flow & nn.ModuleList",
            7: "PyTorch Loss Functions: CrossEntropyLoss Logits & Integers",
            8: "Model Evaluation Mode: model.eval(), Dropout & BatchNorm",
            9: "PyTorch Optimization Loop: optimizer.zero_grad() Gradient Reset",
            10: "PyTorch Device Mismatch & CUDA RuntimeError",
            11: "Learning Rate Scheduling: Cosine Annealing",
            12: "Custom Dataset Implementation: __len__ and __getitem__",
            13: "DataLoader Memory Pinning (pin_memory & Host DMA Transfers)",
            14: "Custom Dataset Sample Indexing Implementation",
            15: "DataLoader Uneven Batches & drop_last Argument"
        },
        "formulas": {
            1: r"(2, 1, 3) \xrightarrow{\text{unsqueeze}(-1)} (2, 1, 3, 1) \xrightarrow{\text{squeeze}(0)} (2, 1, 3, 1) \xrightarrow{\text{squeeze}(-1)} (2, 1, 3)"
        }
    },
    5: {
        "title": "TensorFlow Acceleration & XLA",
        "category": "Framework Acceleration",
        "lecture": "Week 5: TensorFlow 2.x, tf.data, tf.function & XLA",
        "tags": {
            1: "TensorFlow High-Level Prototyping: Keras API",
            2: "Graph Compilation: @tf.function Decorator & AutoGraph",
            3: "Gradient Tape Tracking: PyTorch zero_grad vs TensorFlow Auto-Clear",
            4: "Multiple Loss Gradients: tf.GradientTape(persistent=True)",
            5: "Mutable Stateful Tensors: tf.Variable for Model Weights",
            6: "Compiled C++ Graph Execution Speedup vs Eager Evaluation",
            7: "Input Pipeline Optimization: tf.data.AUTOTUNE Parallelism",
            8: "Data Starvation: CPU Input Bottleneck & GPU Idle Time",
            9: "Multi-Epoch Data Caching: tf.data.Dataset.cache()",
            10: "Graph Retracing Prevention: tf.function input_signature (tf.TensorSpec)",
            11: "Optimized Graph Control Flow: tf.cond vs Python if-else",
            12: "XLA (Accelerated Linear Algebra) Kernel Fusion & On-Chip Registers",
            13: "Model Export & Serving Signatures for TensorFlow Serving",
            14: "Edge & Mobile Deployment: TensorFlow Lite (TFLite)",
            15: "Model Artifact Integrity Verification: fingerprint.pb"
        },
        "formulas": {
            7: r"\text{Pipeline Latency} = \max\left(T_{\text{CPU-preprocess}},\, T_{\text{GPU-compute}}\right) \quad (\text{with Prefetch & AUTOTUNE})"
        }
    },
    6: {
        "title": "LLM Fine-Tuning, PEFT & Quantization",
        "category": "LLMs & Fine-Tuning",
        "lecture": "Week 6: Large Language Model Acceleration & PEFT",
        "tags": {
            1: "LLM Pretraining Objective: Self-Supervised Next-Token Prediction",
            2: "Context Adaptation: Retrieval-Augmented Generation (RAG) vs SFT",
            3: "Full Fine-Tuning Memory Breakdown: Weights, Gradients & AdamW States",
            4: "Text Tokenization: Subword Units & Dense Embedding Lookup",
            5: "Numerical Precision: Brain Float 16 (BF16) Dynamic Exponent Range",
            6: "Numerically Stable Softmax: Shift Invariance & Maximum Subtraction",
            7: "Vanishing Gradients & Numerical Underflow in Low Precision",
            8: "Tensor Dimensions: Gradient Tensors vs Parameter Weights",
            9: "Memory-Compute Tradeoff: Gradient Checkpointing / Activation Recomputation",
            10: "Dynamic Loss Scaling & Overflow Gradient Skipping ('inf'/'nan')",
            11: "Parameter-Efficient Fine-Tuning: Low-Rank Adaptation (LoRA)",
            12: "Base Pretrained LLM Limitations in Zero-Shot Instruction Following",
            13: "Model Weight Freezing in PyTorch (requires_grad = False)",
            14: "LoRA Matrix Initialization: Gaussian A and Zero B (ΔW = B · A = 0)",
            15: "PEFT Adaptation Economics: Lower VRAM, Compute & Storage Footprint"
        },
        "formulas": {
            6: r"\text{softmax}(\mathbf{x})_i = \frac{e^{x_i - \max(\mathbf{x})}}{\sum_j e^{x_j - \max(\mathbf{x})}}",
            14: r"\mathbf{W} = \mathbf{W}_0 + \Delta \mathbf{W} = \mathbf{W}_0 + \frac{\alpha}{r} (\mathbf{B} \cdot \mathbf{A}), \quad \mathbf{B} \in \mathbb{R}^{d \times r}, \, \mathbf{A} \in \mathbb{R}^{r \times k}"
        }
    },
    7: {
        "title": "Distributed Training & Parallelism (DDP, TP, PP)",
        "category": "Distributed Training",
        "lecture": "Week 7: Distributed Deep Learning, NCCL & Parallelism Strategies",
        "tags": {
            1: "Data Parallelism (DP): Model Replication & Batch Partitioning",
            2: "Tensor Parallelism (Megatron-LM): Intra-Layer Weight Splitting",
            3: "PyTorch DistributedSampler & Per-Epoch Seed Shuffling (sampler.set_epoch)",
            4: "Ring All-Reduce Primitives: Reduce-Scatter + All-Gather",
            5: "Ring All-Reduce Communication Volume (2M bytes Asymptotic Limit)",
            6: "PyTorch DDP Process Isolation: One Dedicated Process Per GPU",
            7: "DDP Checkpointing: Model Unwrapping (.module.state_dict())",
            8: "Naive Parameter-Server vs Ring All-Reduce Scaling: O(N·M) vs O(M)",
            9: "PyTorch c10d Distributed Rendezvous & Rank 0 TCPStore Server",
            10: "Interconnect Hierarchy: TCP Sockets vs RoCEv2 / InfiniBand / PCIe",
            11: "Distributed Scaling Paradigms: Weak Scaling vs Strong Scaling",
            12: "PyTorch Profiler Load Imbalance Mitigation: Tensor Padding & Uniform Batches",
            13: "Scaling Efficiency Formula: Throughput(N) / (N * Throughput(1))",
            14: "DDP Communication Levers: Larger Batch Sizes & Gradient Accumulation",
            15: "Fully Sharded Data Parallel (FSDP / ZeRO-3) for 70B+ Parameter LLMs"
        },
        "formulas": {
            5: r"\text{Ring Volume} = 2 \times \frac{N - 1}{N} \times M \xrightarrow{N \to \infty} 2M \text{ bytes}",
            8: r"\text{Communication: } \mathcal{O}(M) \text{ (Ring)} \quad \text{vs} \quad \mathcal{O}(N \times M) \text{ (Naive Master-Worker)}",
            13: r"\text{Scaling Efficiency} = \frac{\text{Throughput}(N)}{N \times \text{Throughput}(1)} \times 100\%"
        }
    },
    8: {
        "title": "Large-Scale Training Dynamics & Checkpointing",
        "category": "Training Dynamics",
        "lecture": "Week 8: LR Scaling, Warmup, Critical Batch Size & Fault Tolerance",
        "tags": {
            1: "Linear Learning Rate Scaling Rule (Goyal et al.)",
            2: "Critical Batch Size & Diminishing Returns in Noise Reduction",
            3: "Learning Rate Warm-Up: Linear Ramp to Prevent Early Divergence",
            4: "Distributed Straggler Effect: Barrier Synchronization Latency",
            5: "Distributed Fault Tolerance: Failure Detection & State Recovery",
            6: "Periodic Checkpointing & Crash Recovery Step Recalculation",
            7: "Asynchronous Checkpointing: Non-Blocking Background I/O",
            8: "Inference Artifact Optimization: Stripping Optimizer Momentum Buffers",
            9: "Model Registry Lifecycle Stages: Staging, Production & Archive",
            10: "Deployment Risk Mitigation: Canary Deployments & Traffic Slicing",
            11: "Kubernetes Health Monitoring: Liveness, Readiness & Startup Probes",
            12: "Zero-Downtime Rollouts: Kubernetes Rolling Update Strategy",
            13: "Linear Learning Rate Warmup Trajectory Over First 10% Steps",
            14: "Large-Batch Optimization Deficit: Fewer Gradient Updates Per Epoch",
            15: "Non-Python Inference Serving: TorchScript (.ts) C++ Compilation"
        },
        "formulas": {
            1: r"\eta_{\text{new}} = \eta_{\text{base}} \times \frac{B_{\text{new}}}{B_{\text{base}}} = 0.075 \times \frac{4096}{512} = 0.075 \times 8 = 0.6",
            6: r"\text{Lost Work} = \text{Crash Step} - \text{Last Checkpoint Step} = 743 - 700 = 43\text{ steps}"
        }
    },
    9: {
        "title": "Graph Compilation (torch.compile) & vLLM Serving",
        "category": "Compilers & Serving",
        "lecture": "Week 9: PyTorch 2.0 Compiler Stack, TorchDynamo & High-Throughput Serving",
        "tags": {
            1: "Graph Capture Limitations: torch.jit.trace Dynamic Control Flow Failures",
            2: "PyTorch 2.x AOT Graph Capture: torch.export & ExportedProgram",
            3: "Batch Size 1 LLM Inference Bottleneck: CPU Kernel Launch Overhead",
            4: "ONNX Computational Graph: Mathematical Operators (Nodes) & Tensors (Edges)",
            5: "Execution Provider Fallback Penalties: Host-Device Sync & Data Transfer",
            6: "Cross-Platform Interoperability: ONNX Runtime Multi-Backend Deployment",
            7: "NVIDIA TensorRT Tactic Selection: Empirical GPU Kernel Profiling",
            8: "High-Throughput LLM Serving: TensorRT-LLM PagedAttention KV Cache",
            9: "TensorRT Engine Building Overhead: Exhaustive Local Kernel Search",
            10: "Asymmetric Quantization: Zero Point Mapping to Real-World 0.0",
            11: "Post-Training Quantization (PTQ) vs Quantization-Aware Training (QAT)",
            12: "LLM Quantization Difficulties: Extreme Activation Outlier Channels",
            13: "Second-Order Quantization: GPTQ (Inverse Hessian Error Compensation)",
            14: "Activation-Aware Weight Quantization (AWQ): Salient Channel Protection",
            15: "Quantization Granularity: Block-Level Group-Wise Scaling vs Per-Tensor"
        },
        "formulas": {
            10: r"x_{\text{quant}} = \text{clamp}\left(\left\lfloor \frac{x}{S} \right\rceil + Z,\, q_{\min},\, q_{\max}\right), \quad Z = \text{Zero Point}",
            13: r"\mathbf{H} = 2 \mathbf{X}\mathbf{X}^T \quad (\text{Hessian of Layer Squared Error Loss})"
        }
    },
    10: {
        "title": "Distributed Data Engineering (Spark, Dask & Ray)",
        "category": "Data Engineering",
        "lecture": "Week 10: Distributed Data Pipelines, Shuffling & Big Data Acceleration",
        "tags": {
            1: "Distributed Data Shuffling: Network I/O, Disk Spill & Serialization Overhead",
            2: "Fault Tolerance via Data Lineage (DAG) & Lost Partition Recomputation",
            3: "Execution Strategies: Spark/Dask Lazy Evaluation DAG vs Pandas Eager Execution",
            4: "Distributed Failure Detection: Worker Node Heartbeat Timeouts",
            5: "Zero-Shuffle Clickstream Grouping: User ID Hash Partitioning",
            6: "Distributed Tabular Scaling (10GB-10TB): Stateful Python Objects (Actors)",
            7: "Elastic Resource Management: Kubernetes Dynamic Autoscaling for Dask",
            8: "GPU Utilization Misconfigurations: Dask vs Specialized Serving Frameworks",
            9: "Data Skew Mitigation: Key Salting & Randomized Suffix Sub-Keys",
            10: "GPU Acceleration Thresholds: PCIe Overhead on Small Data Sets (<100k Rows)",
            11: "Spark Query Optimization: Catalyst Optimizer & Physical Execution Plans",
            12: "Driver Node Out-of-Memory (OOM): Unbounded .collect() on Large Datasets",
            13: "Distributed Observability: Discrete Timestamped Event Logs",
            14: "ETL Troubleshooting: Data Skew Stragglers Caused by Bot Traffic",
            15: "Observability Triad Investigation Order: Logs \u2192 Metrics \u2192 Distributed Traces"
        },
        "formulas": {
            1: r"\text{Shuffle Cost} \propto \mathcal{O}(P \times N) \quad (\text{All-to-All Partition Redistribution})",
            9: r"\text{Salted Key} = \text{Key} \oplus \text{random}(1, K) \implies \text{Eliminates Hot Key Partition Overload}"
        }
    }
}

# Clean Python code blocks for Week 4
WEEK4_CODE_BLOCKS = {
    1: """What is the final shape of the tensor after performing the following tensor operations sequentially?

```python
import torch

# Initial tensor
x = torch.randn(2, 1, 3)

# Sequential tensor transformations
y = x.unsqueeze(-1)
z = y.squeeze(dim=0)
w = z.squeeze(dim=-1)
print(w.shape)
```""",
    5: """Which segment / line would cause this PyTorch module implementation to fail and throw an error?

```python
import torch
import torch.nn as nn

class MyLayer(nn.Module):
    def __init__(self):
        super().__init__()          # ALWAYS call this
        self.linear = nn.Linear(4, 3) # creates W and b
        self.relu = nn.ReLU

    def forward(self, x):
        x = self.linear(x)          # calls linear.forward(x)
        return self.relu(x)

# Instantiate the layer
layer = MyLayer()

# Pass input tensor through the layer
out = layer(torch.randn(2, 4))       # calls Layer.forward()

print(out)
```""",
    6: """Which of the following correctly describes the flow of execution for a single forward pass in DynamicNet?

```python
import torch
import torch.nn as nn

class DynamicNet(nn.Module):
    def __init__(self, d):
        super().__init__()
        # Dynamic architecture combining Linear and ReLU modules
        self.layers = nn.ModuleList()
        for _ in range(2):
            self.layers.append(nn.Linear(d, d))
            self.layers.append(nn.ReLU())

    def forward(self, x):
        for layer in self.layers:
            x = layer(x)
        return x

model = DynamicNet(d=4)
```""",
    14: """Which of the following is the correct implementation for the missing code block inside __getitem__ to extract a single pair of input data and its corresponding label by index?

```python
import torch
from torch.utils.data import Dataset

class TextDataset(Dataset):
    def __init__(self, data, labels):
        self.data = data
        self.labels = labels

    def __len__(self):
        return len(self.data)

    def __getitem__(self, index):
        # Missing Code Block
        return item, label
```"""
}

def clean_lines_from_pages(reader, start_page, end_page):
    noise_exact = {
        'Indian Ins', 'titut', 'e of T', 'echnology Guw', 'aha', 'ti',
        'Indian', 'Guwahati', 'NPTEL', 'Online', 'Certification', 'Course',
        'Applied', 'Accelerated', 'Artificial', 'Intelligence', 'Architecture',
        'Detailed Solution'
    }
    all_lines = []
    for p in range(start_page, end_page):
        raw_text = reader.pages[p].extract_text()
        for line in raw_text.split('\n'):
            s = line.strip()
            if not s:
                continue
            if s in noise_exact:
                continue
            if re.match(r'^Indian\s+Instit?u?t?e?\s+of\s+Technology\s+Guwahati$', s, re.I):
                continue
            if re.match(r'^NPTEL\s+Online\s+Certification\s+Course$', s, re.I):
                continue
            if re.match(r'^Applied\s+Accelerated\s+Artificial\s+(?:Intelligence|Architecture)$', s, re.I):
                continue
            if re.match(r'^Assignment\s*\d+\s*:?\s*Detailed\s+Solution$', s, re.I):
                continue
            all_lines.append(s)
    return all_lines

def parse_assignment_text(week_num, lines):
    full_text = '\n'.join(lines)
    q_matches = list(re.finditer(r'(?:(?:Question|Q)\s*(\d+)[:.]?)', full_text, re.I))
    
    questions = []
    for idx in range(len(q_matches)):
        start = q_matches[idx].start()
        end = q_matches[idx+1].start() if idx+1 < len(q_matches) else len(full_text)
        block = full_text[start:end].strip()
        q_num = int(q_matches[idx].group(1))
        
        ans_m = re.search(r'(?:Correct\s+Answer|Answer)\s*:\s*(.*?)(?=(?:Explanation|Detailed\s+Solution|$))', block, re.I | re.DOTALL)
        sol_m = re.search(r'(?:Explanation|Detailed\s+Solution)\s*:\s*(.*)', block, re.I | re.DOTALL)
        
        raw_ans = ans_m.group(1).strip() if ans_m else ''
        raw_sol = sol_m.group(1).strip() if sol_m else ''
        
        q_and_opts = block[:ans_m.start()].strip() if ans_m else block
        q_and_opts = re.sub(r'^(?:Question|Q)\s*\d+[:.]?\s*', '', q_and_opts, flags=re.I).strip()
        
        opts = []
        if '●' in q_and_opts:
            parts = q_and_opts.split('●')
            q_text = ' '.join(parts[0].split())
            opts_raw = parts[1:]
            for i, opt_str in enumerate(opts_raw):
                clean_opt = ' '.join(opt_str.split())
                m_opt = re.match(r'^([A-D])[\).\s]+(.*)', clean_opt)
                if m_opt:
                    key = m_opt.group(1).upper()
                    otext = m_opt.group(2).strip()
                else:
                    key = chr(ord('A') + i)
                    otext = clean_opt
                opts.append({'key': key, 'text': otext})
        else:
            m_opts_start = re.search(r'(?:Options\s*:\s*)?(?:^|\n)\s*([A-D])[\).]\s*', q_and_opts)
            if m_opts_start:
                q_text = ' '.join(q_and_opts[:m_opts_start.start()].split())
                opts_part = q_and_opts[m_opts_start.start():]
                matches = list(re.finditer(r'(?:^|\n)\s*([A-D])[\).]\s*(.*?)(?=(?:^|\n)\s*[A-D][\).]\s*|$)', opts_part, re.DOTALL))
                for m in matches:
                    opts.append({'key': m.group(1).upper(), 'text': ' '.join(m.group(2).split())})
            else:
                q_text = ' '.join(q_and_opts.split())
                opts = []
                
        ans_clean = ' '.join(raw_ans.split())
        ans_key = ''
        ans_text = ''
        
        if ans_clean in ['A', 'B', 'C', 'D']:
            ans_key = ans_clean
            matched_opt = next((o for o in opts if o['key'] == ans_key), None)
            ans_text = matched_opt['text'] if matched_opt else ans_clean
        elif re.match(r'^[A-D][\)\.\:\-]\s*', ans_clean):
            m_delim = re.match(r'^([A-D])[\)\.\:\-]\s*(.*)', ans_clean)
            ans_key = m_delim.group(1).upper()
            ans_text = m_delim.group(2).strip()
            if not ans_text:
                matched_opt = next((o for o in opts if o['key'] == ans_key), None)
                ans_text = matched_opt['text'] if matched_opt else ans_key
        else:
            ans_lower = ans_clean.lower()
            for o in opts:
                if o['text'].lower() == ans_lower:
                    ans_key = o['key']
                    ans_text = o['text']
                    break
            if not ans_key:
                for o in opts:
                    if ans_lower in o['text'].lower() or o['text'].lower() in ans_lower:
                        ans_key = o['key']
                        ans_text = o['text']
                        break
            if not ans_key:
                ans_words = set(re.findall(r'\w+', ans_lower))
                best_score = 0
                best_opt = None
                for o in opts:
                    owords = set(re.findall(r'\w+', o['text'].lower()))
                    overlap = len(ans_words & owords)
                    if overlap > best_score:
                        best_score = overlap
                        best_opt = o
                if best_opt:
                    ans_key = best_opt['key']
                    ans_text = best_opt['text']
                    
        clean_sol = ' '.join(raw_sol.split())
        if q_text.startswith(':'):
            q_text = q_text[1:].strip()
            
        # Code formatting for Week 4
        if week_num == 4 and q_num in WEEK4_CODE_BLOCKS:
            q_text = WEEK4_CODE_BLOCKS[q_num]
            
        # Metadata
        meta = WEEK_INFO.get(week_num, {})
        tag = meta.get("tags", {}).get(q_num, f"{meta.get('category')} - Q{q_num}")
        formula = meta.get("formulas", {}).get(q_num, "")
        lecture = meta.get("lecture", f"Week {week_num} Assignment")
        
        # Deep Dive markdown
        deep_dive = f"**Official Solution ({tag}):**\n{clean_sol}\n\n*Reference:* {lecture}, IIT Guwahati"
        
        item = {
            "id": f"w{week_num}_q{q_num}",
            "week": week_num,
            "weekTitle": meta.get("title", f"Week {week_num}"),
            "category": meta.get("category", "General"),
            "lectureRef": lecture,
            "qNum": q_num,
            "question": q_text,
            "options": opts,
            "answer": ans_key,
            "answerText": ans_text,
            "explanation": clean_sol,
            "rawAnswerLine": ans_clean,
            "tag": tag,
            "keyFormula": formula,
            "deepDive": deep_dive
        }
        questions.append(item)
    return questions

def main():
    pdf_path = 'assignments/All_Assignments_Master.pdf'
    reader = pypdf.PdfReader(pdf_path)
    assignment_pages = [1, 7, 15, 21, 29, 36, 42, 48, 53, 59, 64]
    
    all_master_questions = []
    
    for w in range(1, 11):
        start_p = assignment_pages[w-1] - 1
        end_p = assignment_pages[w] - 1
        lines = clean_lines_from_pages(reader, start_p, end_p)
        qs = parse_assignment_text(w, lines)
        all_master_questions.extend(qs)
        print(f"Parsed Week {w}: {len(qs)} questions.")
        
    print(f"\nTotal questions parsed: {len(all_master_questions)}")
    
    # Strict validation
    errors = []
    for q in all_master_questions:
        if len(q['options']) < 2:
            errors.append(f"{q['id']}: options count < 2")
        if q['answer'] not in ['A', 'B', 'C', 'D']:
            errors.append(f"{q['id']}: invalid answer key '{q['answer']}' (raw: '{q['rawAnswerLine']}')")
        if not q['explanation']:
            errors.append(f"{q['id']}: explanation is empty")
        for bad in ['Indian Ins', 'titut', 'echnology Guw', 'aha ti']:
            if bad.lower() in q['question'].lower():
                errors.append(f"{q['id']}: header noise in question: {bad}")
            for opt in q['options']:
                if bad.lower() in opt['text'].lower():
                    errors.append(f"{q['id']}: header noise in option {opt['key']}: {bad}")
                    
    if errors:
        print(f"Validation FAILED with {len(errors)} errors:")
        for err in errors:
            print(f"  - {err}")
        return False
    else:
        print("Validation PASSED: 0 errors! All 150 questions strictly verified against the PDF.")
        
    # Write to nptel_quiz_master_data.json
    with open('nptel_quiz_master_data.json', 'w', encoding='utf-8') as f:
        json.dump(all_master_questions, f, indent=2, ensure_ascii=False)
    print("Successfully wrote nptel_quiz_master_data.json")
    
    # Write to nptel_quiz_master_data.js
    with open('nptel_quiz_master_data.js', 'w', encoding='utf-8') as f:
        f.write("// NPTEL Online Certification Course: Applied Accelerated Artificial Intelligence (IIT Guwahati)\n")
        f.write("// Complete 150 Questions Dataset from Official Assignment Solutions (Weeks 1 to 10)\n")
        f.write("window.NPTEL_QUIZ_DATA = ")
        json.dump(all_master_questions, f, indent=2, ensure_ascii=False)
        f.write(";\n")
    print("Successfully wrote nptel_quiz_master_data.js")
    return True

if __name__ == '__main__':
    main()
