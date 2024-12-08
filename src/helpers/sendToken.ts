import {
  Keypair,
  Connection,
  PublicKey,
  type SendOptions,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetInstruction,
  ComputeBudgetProgram,
  SystemProgram,
} from "@solana/web3.js";
import {
  NATIVE_MINT,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { computeUnitLimit, computeUnitPrice } from "../constants";

export async function sendToken({
  mint,
  mintDecimals,
  mintTokenProgram,
  amount,
  from,
  to,
  payer,
  memo,
  latestBlockhash,
  connections,
}: {
  mint: PublicKey;
  mintDecimals: number;
  mintTokenProgram: PublicKey;
  amount: bigint;
  from: Keypair;
  to: PublicKey;
  payer: Keypair;
  memo: string | undefined;
  latestBlockhash: Readonly<{
    blockhash: string;
    lastValidBlockHeight: number;
  }>;
  connections: Connection[];
}): Promise<string | null> {
  try {
    const instructions: Array<TransactionInstruction> = [];
    const [fromAta, toAta] = await Promise.all([
      getAssociatedTokenAddress(mint, from.publicKey, true, mintTokenProgram),
      getAssociatedTokenAddress(mint, to, true, mintTokenProgram),
    ]);

    if (mint.equals(NATIVE_MINT)) {
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey: to,
          lamports: amount,
        })
      );
    } else {
      instructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
          payer.publicKey,
          toAta,
          to,
          mint,
          mintTokenProgram
        )
      );
      instructions.push(
        createTransferCheckedInstruction(
          fromAta,
          mint,
          toAta,
          from.publicKey,
          amount,
          mintDecimals,
          [from, payer],
          mintTokenProgram
        )
      );
    }

    if (memo) {
      instructions.push(
        new TransactionInstruction({
          keys: [{ pubkey: from.publicKey, isSigner: true, isWritable: true }],
          data: Buffer.from(memo, "utf-8"),
          programId: new PublicKey(
            "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
          ),
        })
      );
    }

    instructions.push(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: computeUnitPrice,
      }),
      ComputeBudgetProgram.setComputeUnitLimit({
        units: computeUnitLimit,
      })
    );
    const messageV0 = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions,
    }).compileToV0Message();
    const tx = new VersionedTransaction(messageV0);
    tx.sign([payer, from]);

    const signature = await Promise.any(
      connections.map((conn) => {
        return conn.sendTransaction(tx, {
          skipPreflight: true,
          preflightCommitment: "processed",
        } as SendOptions);
      })
    );
    return signature;
  } catch (error) {
    if (error instanceof AggregateError) error = error.errors[0];
    console.error("Refund failed:", error);
    return null;
  }
}
