import { Connection, Keypair } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

export const TRADING_CONNS = [
  // TODO: Fill
];
export const DATA_CONNS = [
  // TODO: Fill
];
export const refundKeypair = Keypair.fromSecretKey(
  bs58.decode(process.env["PRIVATE_KEY"])
);
export const computeUnitPrice = 100_000; // microLamports
export const computeUnitLimit = 150_000; // units
