/**
 * VM0047 Global Optimal k-NN Mahalanobis Matching Engine
 * Exact Jonker-Volgenant Bipartite Assignment (Simplified Output)
 */
(function (global) {
  "use strict";

  function compareIds(a, b) {
    const sa = String(a).trim();
    const sb = String(b).trim();
    return sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" });
  }

  function computePooledCovarianceAndInverse(Xp, Xc) {
    const nP = Xp.length;
    const nC = Xc.length;
    const P = Xp[0].length;
    const denom = nP + nC - 2;

    const meanP = new Float64Array(P);
    const meanC = new Float64Array(P);
    for (let i = 0; i < nP; i++) {
      for (let p = 0; p < P; p++) meanP[p] += Xp[i][p];
    }
    for (let p = 0; p < P; p++) meanP[p] /= nP;

    for (let j = 0; j < nC; j++) {
      for (let p = 0; p < P; p++) meanC[p] += Xc[j][p];
    }
    for (let p = 0; p < P; p++) meanC[p] /= nC;

    const S = Array.from({ length: P }, () => new Float64Array(P));
    for (let i = 0; i < nP; i++) {
      for (let a = 0; a < P; a++) {
        const da = Xp[i][a] - meanP[a];
        for (let b = a; b < P; b++) {
          S[a][b] += da * (Xp[i][b] - meanP[b]);
        }
      }
    }
    for (let j = 0; j < nC; j++) {
      for (let a = 0; a < P; a++) {
        const da = Xc[j][a] - meanC[a];
        for (let b = a; b < P; b++) {
          S[a][b] += da * (Xc[j][b] - meanC[b]);
        }
      }
    }
    for (let a = 0; a < P; a++) {
      for (let b = a; b < P; b++) {
        S[a][b] /= denom;
        S[b][a] = S[a][b];
      }
    }

    const aug = Array.from({ length: P }, (_, r) => {
      const row = new Float64Array(2 * P);
      for (let c = 0; c < P; c++) row[c] = S[r][c] + (r === c ? 1e-12 : 0);
      row[P + r] = 1.0;
      return row;
    });

    for (let col = 0; col < P; col++) {
      let pivotRow = col;
      let maxVal = Math.abs(aug[col][col]);
      for (let r = col + 1; r < P; r++) {
        if (Math.abs(aug[r][col]) > maxVal) {
          maxVal = Math.abs(aug[r][col]);
          pivotRow = r;
        }
      }
      if (pivotRow !== col) {
        const tmp = aug[col];
        aug[col] = aug[pivotRow];
        aug[pivotRow] = tmp;
      }
      const pivot = aug[col][col];
      for (let c = 0; c < 2 * P; c++) aug[col][c] /= pivot;
      for (let r = 0; r < P; r++) {
        if (r !== col) {
          const factor = aug[r][col];
          for (let c = 0; c < 2 * P; c++) {
            aug[r][c] -= factor * aug[col][c];
          }
        }
      }
    }

    const VI = Array.from({ length: P }, (_, r) => aug[r].slice(P, 2 * P));
    return { S, VI, meanP, meanC };
  }

  function computeMahalanobisMatrix(Xp, Xc, VI) {
    const nP = Xp.length;
    const nC = Xc.length;
    const P = Xp[0].length;

    const XpVI = Array.from({ length: nP }, () => new Float64Array(P));
    const qP = new Float64Array(nP);
    for (let i = 0; i < nP; i++) {
      let sumQ = 0;
      for (let a = 0; a < P; a++) {
        let s = 0;
        for (let b = 0; b < P; b++) s += Xp[i][b] * VI[b][a];
        XpVI[i][a] = s;
        sumQ += s * Xp[i][a];
      }
      qP[i] = sumQ;
    }

    const qC = new Float64Array(nC);
    for (let j = 0; j < nC; j++) {
      let sumQ = 0;
      for (let a = 0; a < P; a++) {
        let s = 0;
        for (let b = 0; b < P; b++) s += Xc[j][b] * VI[b][a];
        sumQ += s * Xc[j][a];
      }
      qC[j] = sumQ;
    }

    const D = Array.from({ length: nP }, () => new Float64Array(nC));
    for (let i = 0; i < nP; i++) {
      const rowXpVI = XpVI[i];
      const rowD = D[i];
      const baseQ = qP[i];
      for (let j = 0; j < nC; j++) {
        let cross = 0;
        const rowXc = Xc[j];
        for (let a = 0; a < P; a++) cross += rowXpVI[a] * rowXc[a];
        const d2 = baseQ + qC[j] - 2.0 * cross;
        rowD[j] = d2 > 0 ? Math.sqrt(d2) : 0.0;
      }
    }
    return D;
  }

  function solveGlobalOptimalAssignment(D, k) {
    const nP = D.length;
    const nC = D[0].length;
    const maxNeeded = Math.min(nC, nP * k);

    const isCandidate = new Uint8Array(nC);
    for (let i = 0; i < nP; i++) {
      const row = D[i];
      const indices = Array.from({ length: nC }, (_, idx) => idx);
      indices.sort((a, b) => row[a] - row[b] || a - b);
      for (let m = 0; m < maxNeeded; m++) {
        isCandidate[indices[m]] = 1;
      }
    }

    const candCols = [];
    for (let j = 0; j < nC; j++) {
      if (isCandidate[j]) candCols.push(j);
    }

    const R = nP * k;
    const C = candCols.length;
    const u = new Float64Array(R + 1);
    const v = new Float64Array(C + 1);
    const p = new Int32Array(C + 1);
    const way = new Int32Array(C + 1);

    for (let r = 1; r <= R; r++) {
      p[0] = r;
      let j0 = 0;
      const minv = new Float64Array(C + 1).fill(Infinity);
      const used = new Uint8Array(C + 1);
      const projIdx = Math.floor((r - 1) / k);
      const rowD = D[projIdx];

      do {
        used[j0] = 1;
        const r0 = p[j0];
        const p0 = Math.floor((r0 - 1) / k);
        const r0D = D[p0];
        let delta = Infinity;
        let j1 = 0;

        for (let c = 1; c <= C; c++) {
          if (!used[c]) {
            const cur = r0D[candCols[c - 1]] - u[r0] - v[c];
            if (cur < minv[c]) {
              minv[c] = cur;
              way[c] = j0;
            }
            if (minv[c] < delta) {
              delta = minv[c];
              j1 = c;
            }
          }
        }

        for (let c = 0; c <= C; c++) {
          if (used[c]) {
            u[p[c]] += delta;
            v[c] -= delta;
          } else {
            minv[c] -= delta;
          }
        }
        j0 = j1;
      } while (p[j0] !== 0);

      do {
        const j1 = way[j0];
        p[j0] = p[j1];
        j0 = j1;
      } while (j0 !== 0);
    }

    const assignedCols = Array.from({ length: nP }, () => []);
    for (let c = 1; c <= C; c++) {
      if (p[c] > 0) {
        const projIdx = Math.floor((p[c] - 1) / k);
        assignedCols[projIdx].push(candCols[c - 1]);
      }
    }
    for (let i = 0; i < nP; i++) {
      assignedCols[i].sort((a, b) => D[i][a] - D[i][b] || a - b);
    }

    const assignedOwner = new Int32Array(nC).fill(-1);
    for (let i = 0; i < nP; i++) {
      for (let m = 0; m < k; m++) {
        assignedOwner[assignedCols[i][m]] = i;
      }
    }

    return { assignedCols, assignedOwner, candCount: C };
  }

  function runVM0047Matching(projTable, ctrlTable, k) {
    const t0 = performance.now();
    k = parseInt(k, 10) || 5;

    const projHeaders = projTable[0].map((h) => String(h || "").trim());
    const ctrlHeaders = ctrlTable[0].map((h) => String(h || "").trim());

    // EXACT FIX: Ignore metadata strings and coordinates during distance computation
    const covNames = [];
    for (let c = 1; c < projHeaders.length; c++) {
      const h = projHeaders[c];
      if (!h) break;
      const hLower = h.toLowerCase();
      if (hLower === "latitude" || hLower === "longitude") continue; // Exclude GPS from Math
      covNames.push(h);
    }
    const P = covNames.length;
    if (P === 0) throw new Error("No numeric covariates found in Project Plots header.");

    const projColIndices = covNames.map((name) => {
      const idx = projHeaders.indexOf(name);
      if (idx === -1) throw new Error(`Covariate '${name}' missing in Project Plots.`);
      return idx;
    });

    const ctrlColIndices = covNames.map((name) => {
      const idx = ctrlHeaders.indexOf(name);
      if (idx === -1) throw new Error(`Covariate '${name}' missing in Control Plots.`);
      return idx;
    });

    const projRowsRaw = projTable.slice(1).filter((r) => r[0] !== null && r[0] !== "");
    const ctrlRowsRaw = ctrlTable.slice(1).filter((r) => r[0] !== null && r[0] !== "");

    projRowsRaw.sort((a, b) => compareIds(a[0], b[0]));
    ctrlRowsRaw.sort((a, b) => compareIds(a[0], b[0]));

    const nP = projRowsRaw.length;
    const nC = ctrlRowsRaw.length;
    
    if (nP < 2) {
      throw new Error(`VM0047 requires at least 2 Project Plots to compute variance (nP = ${nP}).`);
    }
    
    if (nC < nP * k) {
      throw new Error(`Insufficient control plots (${nC}) for ${nP} project plots at k=${k} (need >= ${nP * k}).`);
    }

    const pIds = projRowsRaw.map((r) => String(r[0]).trim());
    const cIds = ctrlRowsRaw.map((r) => String(r[0]).trim());

    // Validate only the target SI covariates
    const Xp = projRowsRaw.map((r, i) =>
      projColIndices.map((idx, p) => {
        const num = Number(r[idx]);
        if (r[idx] === "" || r[idx] === null || isNaN(num)) {
          throw new Error(`Invalid numeric data in Project Plot '${r[0]}' for covariate '${covNames[p]}'.`);
        }
        return num;
      })
    );
    
    const Xc = ctrlRowsRaw.map((r, j) =>
      ctrlColIndices.map((idx, p) => {
        const num = Number(r[idx]);
        if (r[idx] === "" || r[idx] === null || isNaN(num)) {
          throw new Error(`Invalid numeric data in Control Plot '${r[0]}' for covariate '${covNames[p]}'.`);
        }
        return num;
      })
    );

    const { S, VI } = computePooledCovarianceAndInverse(Xp, Xc);
    const D = computeMahalanobisMatrix(Xp, Xc, VI);
    const { assignedCols, assignedOwner, candCount } = solveGlobalOptimalAssignment(D, k);

    // Identify Latitude/Longitude indexes for raw report extraction
    const ctrlLatIdx = ctrlHeaders.findIndex(h => h.toLowerCase() === "latitude");
    const ctrlLonIdx = ctrlHeaders.findIndex(h => h.toLowerCase() === "longitude");

    const matchedPairs = [];
    let totalMD = 0;

    for (let i = 0; i < nP; i++) {
      const cols = assignedCols[i];
      const mds = cols.map((c) => D[i][c]);
      
      for (let m = 0; m < k; m++) {
        const c = cols[m];
        const d = mds[m];
        totalMD += d;

        matchedPairs.push({
          projectPlotId: pIds[i],
          controlPlotId: cIds[c],
          neighborRank: m + 1,
          mahalanobisDistance: d,
          controlLat: ctrlLatIdx !== -1 ? Number(ctrlRowsRaw[c][ctrlLatIdx]) : "N/A",
          controlLon: ctrlLonIdx !== -1 ? Number(ctrlRowsRaw[c][ctrlLonIdx]) : "N/A"
        });
      }
    }

    const runtimeMs = performance.now() - t0;
    return {
      k, nP, nC, totalMD, meanMD: totalMD / (nP * k), candCount, runtimeMs, matchedPairs
    };
  }

  global.VM0047Engine = { runVM0047Matching };
})(typeof window !== "undefined" ? window : globalThis);