"use server";
import { Connection, PublicKey } from "@solana/web3.js";

// Define the RPC endpoint and the user's wallet public key
const rpcEndpoint = "https://api.mainnet-beta.solana.com";
const walletPublicKeyString = process.env.WALLET as string;

// Create a connection to the Solana network
const connection = new Connection(rpcEndpoint);

// Convert the wallet public key string to a PublicKey object
const walletPublicKey = new PublicKey(walletPublicKeyString);

// Get the program accounts owned by the Stake Program
const programId = new PublicKey("Stake11111111111111111111111111111111111111");
const filters = [
  {
    memcmp: {
      offset: 12,
      bytes: walletPublicKey.toBase58(),
    },
  },
];

export async function getStakeAccounts() {
  const accounts = await connection.getProgramAccounts(programId, {
    filters,
  });
  console.log("Stake Accounts:", accounts);
  const accts = accounts.map((account) => ({
    account: account.pubkey.toBase58(),
    lamports: account.account.lamports,
    owner: account.account.owner.toBase58(),
  }));
  return accts;
}
