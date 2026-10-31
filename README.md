<div align="center">

# ⛓️ PlotPair

### **High-Performance VM0047 Global Optimal k-NN Matching Engine for Microsoft Excel**

[![Platform](https://img.shields.io/badge/Platform-Microsoft%20Excel%20%7C%20Office.js-FFF3E6?style=for-the-badge&logo=microsoftexcel&logoColor=FFF3E6&labelColor=381932)](https://developer.microsoft.com/office)
[![Standard](https://img.shields.io/badge/Standard-Verra%20VM0047%20v1.1-FFF3E6?style=for-the-badge&logo=shield&logoColor=FFF3E6&labelColor=381932)](https://verra.org/methodologies/vm0047/)
[![Algorithm](https://img.shields.io/badge/Algorithm-Jonker--Volgenant%20LSA-FFF3E6?style=for-the-badge&logo=matrix&logoColor=FFF3E6&labelColor=381932)](https://en.wikipedia.org/wiki/Auction_algorithm)
[![Runtime](https://img.shields.io/badge/Engine-100%25%20Client--Side%20JS-FFF3E6?style=for-the-badge&logo=javascript&logoColor=FFF3E6&labelColor=381932)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

<br/>

```
     ┌──────────────────────────────────────────────────────────────┐
     │      PROJECT PLOTS                     CONTROL DONOR POOL    │
     │      [ nP = 55 Plots ]                 [ nC = 20,000 Plots ] │
     └──────────────┬─────────────────────────────────┬─────────────┘
                    │                                 │
                    ▼                                 ▼
           [ Dynamic Spatial Coordinate Isolation (Lat / Lon) ]
                                    │
                                    ▼
       [ Group-Centered Pooled Covariance (Σ_pooled) & Inversion (VI) ]
                                    │
                                    ▼
        [ Vectorized Decomposition: D_ij = √(qP_i + qC_j - 2·Xp_i·VI·Xc_j) ]
                                    │
                                    ▼
              [ Lossless Pigeonhole Candidate Pruning ]
              [ Evaluates Top (nP × k) Neighbors per Plot ]
                                    │
                                    ▼
         [ Rectangular Jonker-Volgenant Shortest Augmenting Path ]
         [ Globally Minimizes Sum of Distances Without Replacement ]
                                    │
                                    ▼
             ==============================================
             🎯 OUTPUT: Pure Non-Destructive Ledger
             📄 Sheet: Audit_1_Matched_Pairs (k × nP rows)
             ==============================================
```

</div>

---

## 📌 Executive Summary

Under **Verra VM0047** dynamic Matched Reference Area (dMRV) methodologies, baseline carbon accounting requires matching each Project Plot to $k$ nearest-neighbor Control Plots ($k \in \{5, 7\}$) without replacement.

**PlotPair** is a native, zero-dependency Excel Web Add-in built on the Microsoft Office.js runtime. It replaces conventional, flawed spreadsheet macros with an exact, vectorized matrix calculation engine and bipartite optimization solver. It executes entirely in client-side memory across Windows, macOS, and Excel on the Web—requiring **zero backend servers**, external Python scripts, or command-line runtimes.

---

## ⚡ The Fundamental Methodological Difference

### ❌ Conventional Greedy / Sequential Matching

```
Project Plot 1 ───(Claims Closest)────► Control Plot 42 [Locked]
Project Plot 2 ───(Wants Closest)─────► Control Plot 42 [BLOCKED!] ──► Pushed to Suboptimal CP 98
```

- **First-Come, First-Served Bias:** Early plots claim optimal controls, forcing subsequent plots into poor statistical matches.
- **Euclidean Collinearity Trap:** Standard Euclidean formulas treat correlated time-series vegetation indices (e.g., $SI_{2014}, SI_{2018}, SI_{2023}$) as independent dimensions, artificially multiplying their weight in the distance calculation.

### ✅ PlotPair Global Optimal Matching

```
All Plots (1..nP) ────[ Global Bipartite Matrix Optimization ]────► All Controls (1..nC)
Result: Mathematically proven lowest total distance sum ∑ D_ij across the entire dataset.
```

- **No Sequential Locking:** Every potential assignment is evaluated simultaneously using the **Jonker-Volgenant Shortest Augmenting Path (SAP)** algorithm.
- **Covariance Normalization:** Covariance auto-correlations are identified and neutralized using a pooled group-centered precision matrix $\mathbf{\Sigma}_{\text{pooled}}^{-1}$.
- **100% Non-Destructive:** Raw Project and Control sheets are read in-memory and **never** modified, reordered, or overwritten.

---

## 🧮 Mathematical Architecture

### 1. Group-Centered Pooled Covariance Matrix ($\mathbf{\Sigma}_{\text{pooled}}$)

To eliminate scale variance across differing units without introducing cross-treatment mean distortion:

$$\mathbf{\Sigma}_{\text{pooled}} = \frac{(n_P - 1)\mathbf{S}_P + (n_C - 1)\mathbf{S}_C}{n_P + n_C - 2}$$

Where $\mathbf{S}_P$ and $\mathbf{S}_C$ represent the sample covariance matrices of the Project ($n_P$) and Control ($n_C$) datasets.

### 2. Regularized Precision Matrix Inversion

The precision matrix $\mathbf{\Sigma}_{\text{pooled}}^{-1}$ is inverted using Gauss-Jordan elimination with partial pivoting and Tikhonov regularization ($\lambda = 10^{-12}$) to prevent matrix singularities caused by near-collinear variables:

$$(\mathbf{\Sigma}_{\text{pooled}} + \lambda \mathbf{I}) \mathbf{\Sigma}_{\text{pooled}}^{-1} = \mathbf{I}$$

### 3. Vectorized Mahalanobis Distance Decomposition

To evaluate millions of pairwise comparisons in milliseconds without memory exhaustion, the engine precomputes quadratic self-terms and caches matrix multiplications:

$$D_{i,j} = \sqrt{\max\left(0, \, qP_i + qC_j - 2 \cdot (\mathbf{X}_{P,i} \mathbf{\Sigma}_{\text{pooled}}^{-1} \cdot \mathbf{X}_{C,j})\right)}$$

- $qP_i = \mathbf{X}_{P,i} \mathbf{\Sigma}_{\text{pooled}}^{-1} \mathbf{X}_{P,i}^T$
- $qC_j = \mathbf{X}_{C,j} \mathbf{\Sigma}_{\text{pooled}}^{-1} \mathbf{X}_{C,j}^T$
- $(\mathbf{X}_{P} \mathbf{\Sigma}_{\text{pooled}}^{-1})$ is evaluated once as an $n_P \times P$ matrix, reducing computational complexity to $O(n_P \cdot n_C \cdot P)$.

### 4. Lossless Pigeonhole Candidate Pruning

In an operational run ($n_P = 55, k = 5, n_C = 20,000$), the bipartite cost graph contains $1,100,000$ edges. Mathematically, no project plot can ever be assigned to a control plot ranked lower than $n_P \times k$ in its preference order.

PlotPair extracts the set union of each project plot's top candidates:

$$\mathcal{C}_{\text{cand}} = \bigcup_{i=1}^{n_P} \text{TopCandidates}(i, \, n_P \cdot k)$$

This reduces the bipartite column dimension from $20,000$ to $C \le n_P^2 \cdot k$, guaranteeing exact global optimality while reducing solve time to under 50 milliseconds.

---

## 📋 Data Contract & Input Invariants

PlotPair dynamically inspects raw worksheet ranges or structured Excel Tables (`Ctrl + T`):

```
┌───────────┬─────────────┬──────────────┬───────────┬───────────┬───────────┐
│  Plot_ID  │  Latitude   │  Longitude   │  SI_2014  │  SI_2018  │  SI_2023  │
├───────────┼─────────────┼──────────────┼───────────┼───────────┼───────────┤
│   P_001   │  20.451230  │  78.512400   │   0.241   │   0.265   │   0.289   │
│   P_002   │  21.109840  │  79.124500   │   0.198   │   0.210   │   0.235   │
└───────────┴─────────────┴──────────────┴───────────┴───────────┴───────────┘
```

| Invariant              | Rule & Behavior                                                                                                                                                            |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unique Identifiers** | Column 1 must contain alphanumeric plot IDs (`Plot_ID`, `Control_ID`).                                                                                                     |
| **Spatial Isolation**  | Columns named `Latitude` and `Longitude` (case-insensitive) are dynamically excluded from statistical covariance math and preserved for audit reporting.                   |
| **Numeric Strictness** | Covariate columns must contain valid floating-point numbers. Blank cells or `#N/A` errors halt execution immediately with an explicit error specifying the row and column. |
| **Sample Size Bounds** | Requires $n_P \ge 2$ to compute sample variance and donor pool size $n_C \ge n_P \times k$.                                                                                |

---

## 📊 Output Ledger Specification

When matching completes, PlotPair generates a dedicated, non-destructive audit worksheet:

### `Audit_1_Matched_Pairs`

```
┌─────────────────┬───────────────┬──────────────────┬──────────────────┬───────────────────┬──────────────────────┐
│ Project_Plot_ID │ Neighbor_Rank │ Control_Plot_ID  │ Control_Latitude │ Control_Longitude │ Mahalanobis_Distance │
├─────────────────┼───────────────┼──────────────────┼──────────────────┼───────────────────┼──────────────────────┤
│      P_001      │       1       │     C_04812      │    20.812405     │     78.910245     │       0.142095       │
│      P_001      │       2       │     C_11204      │    21.004120     │     78.431209     │       0.189541       │
│      P_001      │       3       │     C_00982      │    20.312904     │     79.112450     │       0.210482       │
│      ...        │      ...      │       ...        │       ...        │        ...        │         ...          │
└─────────────────┴───────────────┴──────────────────┴──────────────────┴───────────────────┴──────────────────────┘
```

---

## 🖥️ Task Pane Interface & Telemetry

The user interface follows a Deep Forest Green (`#064734`) and Mint (`#E0FFC2`) palette:

```
┌─────────────────────────────────────────────────────────┐
│  Configuration                              ↻ Refresh   │
│  Global Jonker-Volgenant Bipartite Solver               │
│                                                         │
│  Project Data Source:                                   │
│  [ Sheet: ProjectPlots                               ▼ ]│
│                                                         │
│  Control Data Source:                                   │
│  [ Sheet: ControlPlots                               ▼ ]│
│                                                         │
│  Neighbors per Project Plot (k):                        │
│  [ k = 5 (Controls Locked)                           ▼ ]│
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │             Match Data & Build Output             │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Execution Telemetry:                                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │ ✔ GLOBAL OPTIMUM LOCKED (42.6 ms)                 │  │
│  │ Matched Pairs: 55 plots × 5 = 275 controls        │  │
│  │ Total Global MD: 184.2910                         │  │
│  │ Action: Source Sheets NOT modified                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🧮 Native Formula Support

PlotPair provides custom in-cell Excel formulas:

### 1. `=VM0047.MATCH(projectTable, controlTable, [k])`

Spills the complete 6-column matched pairs table dynamically across worksheet cells:

```excel
=VM0047.MATCH(ProjectPlots[#All], ControlPlots[#All], 5)
```

### 2. `=VM0047.MD_CHECK(projectTable, controlTable, projectId, controlId)`

Targeted scalar formula for verification bodies to inspect the exact statistical distance between any project plot and control plot:

```excel
=VM0047.MD_CHECK(ProjectPlots[#All], ControlPlots[#All], "P_001", "C_04812")
```

---

## 📂 Repository File Tree

```text
PlotPair/
├── .gitignore            # Excludes dependencies, test sheets, and certificates
├── _headers              # CORS security configuration for Excel runtimes
├── functions.json        # Custom function metadata registry
├── manifest.xml          # Microsoft Office Add-in manifest
├── matchingEngine.js     # Vectorized Mahalanobis + Jonker-Volgenant solver
├── package.json          # Project manifest and dev dependencies
├── package-lock.json     # Dependency lockfile
├── plotpair-icon.svg     # Source vector icon asset
├── taskpane.html         # Sidebar UI structure and styling
└── taskpane.js           # Excel.run batch operations and sheet writer
```
