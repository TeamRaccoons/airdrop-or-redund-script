import fs from "fs";
import * as path from "path";
import { parse } from "json2csv";
import { DATA_CONNS } from "./constants";
import { sleep } from "bun";
import { readCSVFile } from "./helpers/csv";

const filePath = path.join(__dirname, "../csv/airdrop.csv");

const latestBlockhashRef = {
  value: await DATA_CONNS[0].getLatestBlockhash("confirmed"),
};
setTimeout(async () => {
  while (true) {
    try {
      latestBlockhashRef.value = await DATA_CONNS[0].getLatestBlockhash(
        "confirmed"
      );
    } catch (err) {}
    await sleep(1000);
  }
}, 1000);

const results = await readCSVFile(filePath);

console.log("Start checking process");
const batchSize = 10;
const totalBatches = Math.ceil(results.length / batchSize);
for (let i = 0; i < results.length; i += batchSize) {
  console.log(`Checking batch ${i / batchSize + 1} of ${totalBatches}...`);
  const batch = results.slice(i, i + batchSize);
  const checkPromises = batch.map(async (row) => {
    const result = await DATA_CONNS[0].getTransaction(row.refundSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (result?.meta?.err) {
      row.status = "failed";
    } else {
      row.status = "success";
    }
  });

  await Promise.all(checkPromises);
  const updatedCsv = parse(results);
  fs.writeFileSync(filePath, updatedCsv);
  console.log(`Checking batch ${i / batchSize + 1} of ${totalBatches}`);
}
console.log("Check Completed");

process.exit(0);
