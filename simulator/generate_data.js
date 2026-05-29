const fs = require("fs");
const { generateAllHistory } = require("./generate-history");

// Generate data
const history = generateAllHistory();

// Convert JSON → CSV
function convertToCSV(data) {
  const headers = Object.keys(data[0]);

  const csvRows = [];
  csvRows.push(headers.join(","));

  for (const row of data) {
    const values = headers.map((h) => row[h]);
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

// Generate separate CSV files per machine
for (const machineId in history) {
  let rows = history[machineId];

  // OPTIONAL: remove columns not needed for ML
  rows = rows.map((row) => {
    const newRow = { ...row };

    delete newRow.timestamp;   // remove time
    delete newRow.machine_id;  // remove ID (optional)

    return newRow;
  });

  const csvData = convertToCSV(rows);

  const fileName = `${machineId}_dataset.csv`;

  fs.writeFileSync(fileName, csvData);

  console.log(`✅ Saved: ${fileName} | Rows: ${rows.length}`);
}

console.log("\n🎯 All machine datasets generated successfully!");