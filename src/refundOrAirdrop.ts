import * as fs from "fs";
import * as path from "path";
import { PublicKey } from "@solana/web3.js";
import { sendToken } from "./helpers/sendToken";
import { DATA_CONNS, TRADING_CONNS, refundKeypair } from "./constants";
import { sleep } from "bun";
import { parse } from "json2csv";
import { getTokenDecimals, getTokenProgram } from "./helpers/spl";
import { readCSVFile } from "./helpers/csv";

const filePath = path.join(__dirname, "../csv/extra/airdrop.csv");

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

const csvResults = await readCSVFile(filePath);
const results = csvResults;

console.log({ results: results.length });

const batchSize = 10;
const totalBatches = Math.ceil(results.length / batchSize);
for (let i = 0; i < results.length; i += batchSize) {
  console.log(`Processing batch ${i / batchSize + 1} of ${totalBatches}...`);
  const batch = results.slice(i, i + batchSize);
  const refundPromises = batch.map(async (row) => {
    if (!row.refundSignature) {
      const mintDecimals = await getTokenDecimals(
        DATA_CONNS,
        new PublicKey(row.mint)
      );
      const mintTokenProgram = await getTokenProgram(
        TRADING_CONNS,
        new PublicKey(row.mint)
      );
      const refundSignature = await sendToken({
        mint: new PublicKey(row.mint),
        mintDecimals,
        mintTokenProgram,
        amount: BigInt(row.rawAmount),
        payer: refundKeypair,
        from: refundKeypair,
        to: new PublicKey(row.recipient),
        memo: undefined,
        latestBlockhash: latestBlockhashRef.value,
        connections: TRADING_CONNS,
      });
      if (refundSignature) {
        row.refundSignature = refundSignature;
        console.log(
          `Refunded ${row.rawAmount} tokens to ${row.user}. TxID: ${refundSignature}`
        );
        const updatedCsv = parse(results);
        fs.writeFileSync(filePath, updatedCsv);
      } else {
        console.log(`Failed to refund ${row.user} ${row.rawAmount} tokens.`);
      }
    }
  });
  await Promise.all(refundPromises);
  const updatedCsv = parse(results);
  fs.writeFileSync(filePath, updatedCsv);
  console.log(`Processed batch ${i / batchSize + 1} of ${totalBatches}`);
}
console.log("Refund Completed");

process.exit(0);
