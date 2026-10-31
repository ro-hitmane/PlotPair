/* global Office, Excel, CustomFunctions, VM0047Engine */

(function () {
  "use strict";

  Office.onReady(async (info) => {
    if (info.host === Office.HostType.Excel) {
      const btnRefresh = document.getElementById("btnRefresh");
      const btnRunSort = document.getElementById("btnRunSort");

      if (btnRefresh)
        btnRefresh.addEventListener("click", populateWorkbookSources);
      if (btnRunSort)
        btnRunSort.addEventListener("click", executeMatchAndSortBothTables);

      await populateWorkbookSources();
    }
  });

  async function populateWorkbookSources() {
    const projSelect = document.getElementById("projSource");
    const ctrlSelect = document.getElementById("ctrlSource");
    const btnRefresh = document.getElementById("btnRefresh");

    if (!projSelect || !ctrlSelect) return;

    if (btnRefresh) btnRefresh.textContent = "Scanning...";

    setTimeout(async () => {
      try {
        await Excel.run(async (context) => {
          const sheets = context.workbook.worksheets;
          const tables = context.workbook.tables;
          sheets.load("items/name");
          tables.load("items/name");
          await context.sync();

          projSelect.innerHTML = "";
          ctrlSelect.innerHTML = "";

          const options = [];
          tables.items.forEach((t) =>
            options.push({
              value: `TABLE:${t.name}`,
              label: `Table: ${t.name}`,
            }),
          );
          sheets.items.forEach((s) => {
            if (!s.name.startsWith("Audit_")) {
              options.push({
                value: `SHEET:${s.name}`,
                label: `Sheet: ${s.name}`,
              });
            }
          });

          options.forEach((opt) => {
            const o1 = document.createElement("option");
            o1.value = opt.value;
            o1.textContent = opt.label;
            projSelect.appendChild(o1);

            const o2 = document.createElement("option");
            o2.value = opt.value;
            o2.textContent = opt.label;
            ctrlSelect.appendChild(o2);
          });

          const projIdx = options.findIndex((o) => /proj/i.test(o.label));
          const ctrlIdx = options.findIndex((o) =>
            /ctrl|control|donor/i.test(o.label),
          );
          if (projIdx >= 0) projSelect.selectedIndex = projIdx;
          if (ctrlIdx >= 0) ctrlSelect.selectedIndex = ctrlIdx;
          else if (options.length > 1) ctrlSelect.selectedIndex = 1;
        });

        if (btnRefresh) {
          btnRefresh.textContent = "Refreshed!";
          setTimeout(() => {
            btnRefresh.textContent = "↻ Refresh Data";
          }, 1500);
        }
      } catch (err) {
        setStatus(`Error scanning workbook: ${err.message}`);
      }
    }, 50);
  }

  function setStatus(htmlContent) {
    const el = document.getElementById("statusOutput");
    if (el) el.innerHTML = htmlContent;
  }

  async function readSourceValues(context, descriptor) {
    const [type, name] = descriptor.split(":");
    let range;
    if (type === "TABLE") {
      const table = context.workbook.tables.getItem(name);
      range = table.getRange();
    } else {
      const sheet = context.workbook.worksheets.getItem(name);
      range = sheet.getUsedRange();
    }
    range.load("values");
    await context.sync();
    return { type, name, values: range.values };
  }

  // BULLETPROOF MATRIX WRITER
  async function writeMatrixToSheet(
    context,
    sheetName,
    matrix,
    chunkRows = 5000,
  ) {
    const sheets = context.workbook.worksheets;
    let sheet = sheets.getItemOrNullObject(sheetName);
    await context.sync();

    if (sheet.isNullObject) {
      sheet = sheets.add(sheetName);
    } else {
      sheet.getUsedRange().clear();
    }

    const totalRows = matrix.length;
    const totalCols = matrix[0].length;

    // Force perfect rectangle to prevent Excel API jagged array crash
    for (let r = 0; r < totalRows; r++) {
      if (matrix[r].length !== totalCols) {
        const newRow = Array.from(matrix[r]);
        while (newRow.length < totalCols) newRow.push("");
        matrix[r] = newRow.slice(0, totalCols);
      }
      for (let c = 0; c < totalCols; c++) {
        if (typeof matrix[r][c] === "number" && !isFinite(matrix[r][c])) {
          matrix[r][c] = "N/A";
        }
      }
    }

    for (let startRow = 0; startRow < totalRows; startRow += chunkRows) {
      const endRow = Math.min(startRow + chunkRows, totalRows);
      const slice = matrix.slice(startRow, endRow);
      const targetRange = sheet.getRangeByIndexes(
        startRow,
        0,
        slice.length,
        totalCols,
      );
      targetRange.values = slice;
      await context.sync();
    }

    const headerRange = sheet.getRangeByIndexes(0, 0, 1, totalCols);
    headerRange.format.font.bold = true;
    headerRange.format.fill.color = "#E2E8F0";
    return sheet;
  }

  async function executeMatchAndSortBothTables() {
    const projDescriptor = document.getElementById("projSource").value;
    const ctrlDescriptor = document.getElementById("ctrlSource").value;
    const k = parseInt(document.getElementById("kSelect").value, 10) || 5;

    setStatus("1/3 Reading Project & Control Data...");

    try {
      await Excel.run(async (context) => {
        const projSource = await readSourceValues(context, projDescriptor);
        const ctrlSource = await readSourceValues(context, ctrlDescriptor);

        setStatus(`2/3 Running PlotPair Optimal Solver (k = ${k})...`);
        const res = VM0047Engine.runVM0047Matching(
          projSource.values,
          ctrlSource.values,
          k,
        );

        context.application.suspendApiCalculationUntilNextSync();
        setStatus("3/3 Generating Audit 1 (Matched Pairs) Tab...");

        const pairsMatrix = [
          [
            "Project_Plot_ID",
            "Neighbor_Rank",
            "Control_Plot_ID",
            "Control_Latitude",
            "Control_Longitude",
            "Mahalanobis_Distance",
          ],
        ];
        res.matchedPairs.forEach((m) => {
          pairsMatrix.push([
            m.projectPlotId,
            m.neighborRank,
            m.controlPlotId,
            m.controlLat,
            m.controlLon,
            Number(m.mahalanobisDistance.toFixed(6)),
          ]);
        });

        // Generate a dynamic, unique sheet name using k and a timestamp
        const now = new Date();
        const timeSuffix =
          now.getHours().toString().padStart(2, "0") +
          now.getMinutes().toString().padStart(2, "0") +
          now.getSeconds().toString().padStart(2, "0");
        const auditSheetName = `Audit_1_k${k}_${timeSuffix}`;

        await writeMatrixToSheet(context, auditSheetName, pairsMatrix);

        const dashboardHTML = `
          <div style="font-weight: 700; color: #166534; font-size: 13px; margin-bottom: 8px; display: flex; align-items: center;">
            <svg style="width: 14px; height: 14px; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
            GLOBAL OPTIMUM LOCKED (${res.runtimeMs.toFixed(1)} ms)
          </div>
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; font-size: 11.5px; color: #064734;">
            <div style="font-weight:600;">Matched Pairs:</div>
            <div>${res.nP} plots &times; ${res.k} = ${res.nP * res.k} controls</div>
            
            <div style="font-weight:600;">Total Global MD:</div>
            <div>${res.totalMD.toFixed(4)}</div>
            
            <div style="font-weight:600;">Action:</div>
            <div>Source Sheets NOT modified</div>
            
            <div style="font-weight:600;">Generated:</div>
            <div>${auditSheetName}</div>
          </div>
        `;
        setStatus(dashboardHTML);
      });
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  }

  // Register In-Cell Custom Function =VM0047.MATCH()
  if (typeof CustomFunctions !== "undefined") {
    CustomFunctions.associate(
      "MATCH",
      function (projectTable, controlTable, k) {
        try {
          const res = VM0047Engine.runVM0047Matching(
            projectTable,
            controlTable,
            k || 5,
          );
          const out = [
            [
              "Project_Plot_ID",
              "Neighbor_Rank",
              "Control_Plot_ID",
              "Control_Latitude",
              "Control_Longitude",
              "Mahalanobis_Distance",
            ],
          ];
          res.matchedPairs.forEach((m) => {
            out.push([
              m.projectPlotId,
              m.neighborRank,
              m.controlPlotId,
              m.controlLat,
              m.controlLon,
              Number(m.mahalanobisDistance.toFixed(6)),
            ]);
          });
          return out;
        } catch (err) {
          return [[`ERROR: ${err.message}`]];
        }
      },
    );
  }
})();
