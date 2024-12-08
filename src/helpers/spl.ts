import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { ParsedAccountData } from "@solana/web3.js";
import { Connection, PublicKey } from "@solana/web3.js";
import { LRUCache } from "lru-cache";

interface ParsedMintData {
  decimals: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  extensions?: any[];
  freezeAuthority: string;
  isInitialized: boolean;
  mintAuthority: string;
  supply: string;
}
interface TokenMetadata {
  parsedMintData: ParsedMintData;
  tokenProgram: PublicKey;
}
const tokenMetadataCache = new LRUCache<string, TokenMetadata>({
  max: 300_000,
  ttl: 86_400_000, // 1 day
});

export async function getMetadata(
  conns: Connection[],
  mint: PublicKey
): Promise<TokenMetadata> {
  const cache = tokenMetadataCache.get(mint.toBase58());
  if (cache)
    return {
      parsedMintData: cache.parsedMintData,
      tokenProgram: cache.tokenProgram,
    };

  const { value } = await Promise.any(
    conns.map((conn) => conn.getParsedAccountInfo(mint))
  );
  if (!value) throw "Missing account info";

  const parsedAccountData = value.data as ParsedAccountData;
  // cache this into redis?

  const parsedMintData = parsedAccountData.parsed.info as ParsedMintData;
  const tokenProgram =
    parsedAccountData.program === "spl-token-2022"
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

  const res = { parsedMintData, tokenProgram };
  tokenMetadataCache.set(mint.toBase58(), res);

  return res;
}

export async function getTokenProgram(
  conns: Connection[],
  mint: PublicKey
): Promise<PublicKey> {
  const { tokenProgram } = await getMetadata(conns, mint);
  return tokenProgram;
}

export async function getTokenDecimals(
  conns: Connection[],
  mint: PublicKey
): Promise<number> {
  const { parsedMintData } = await getMetadata(conns, mint);
  return parsedMintData.decimals;
}
