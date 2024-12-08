import * as fs from "fs";
import csv from "csv-parser";

export interface CsvData {
  user: string;
  recipient: string;
  mint: string;
  rawAmount: string;
  refundSignature: string;
  status: string;
}

export async function readCSVFile(filePath: string): Promise<Array<CsvData>> {
  const results: Array<CsvData> = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}
