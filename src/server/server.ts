"use server";
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  RpcResponseAndContext,
  SignatureResult,
  SimulatedTransactionResponse,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

// Define the RPC endpoint and the user's wallet public key
const rpcEndpoint = "https://api.mainnet-beta.solana.com";
const pubKey = process.env.WALLET as string;

// Create a connection to the Solana network
const connection = new Connection(rpcEndpoint);

// Convert the wallet public key string to a PublicKey object
const walletPublicKey = new PublicKey(pubKey);

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
  // console.log("Stake Accounts:", accounts);
  const accts = accounts.map((account) => ({
    account: account.pubkey.toBase58(),
    lamports: account.account.lamports,
    owner: account.account.owner.toBase58(),
  }));
  return { pubKey, accts };
}

export async function getSimulationComputeUnits(
  // connection: Connection,
  testName: string,
  instructions: Array<TransactionInstruction>,
  payer: PublicKey,
  lookupTables: Array<AddressLookupTableAccount> | []
): Promise<number | null> {
  // const instructions = [
  //   SystemProgram.transfer({
  //     fromPubkey: walletPublicKey,
  //     toPubkey: walletPublicKey,
  //     lamports: 0,
  //   }),
  // ];
  const testInstructions = [
    // Set an arbitrarily high number in simulation
    // so we can be sure the transaction will succeed
    // and get the real compute units used
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ...instructions,
  ];

  // const payer = walletPublicKey;
  const testTransaction = new VersionedTransaction(
    new TransactionMessage({
      instructions: testInstructions,
      payerKey: payer,
      // RecentBlockhash can by any public key during simulation
      // since 'replaceRecentBlockhash' is set to 'true' below
      recentBlockhash: PublicKey.default.toString(),
    }).compileToV0Message(lookupTables)
  );
  const buffer = Buffer.from(testTransaction.serialize());
  const base64String = buffer.toString("base64");
  console.log(testName, base64String);

  const rpcResponse = await connection.simulateTransaction(testTransaction, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  getErrorFromRPCResponse(rpcResponse);
  console.log(
    `${testName} Compute Units:`,
    rpcResponse.value.unitsConsumed || null
  );
  return rpcResponse.value.unitsConsumed || null;
}

// USDT
// [createTransferCheckedInstruction(
//   new PublicKey("BDtbKyENtfkgcWYT3ozg9WAd4hk7QgeFbDJaejTJPRPP"),
//   new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
//   new PublicKey("BDtbKyENtfkgcWYT3ozg9WAd4hk7QgeFbDJaejTJPRPP"),
//   walletPublicKey,
//   100_000,
//   6,
// )],

const getErrorFromRPCResponse = (
  rpcResponse: RpcResponseAndContext<
    SignatureResult | SimulatedTransactionResponse
  >
) => {
  // Note: `confirmTransaction` does not throw an error if the confirmation does not succeed,
  // but rather a `TransactionError` object. so we handle that here
  // See https://solana-labs.github.io/solana-web3.js/classes/Connection.html#confirmTransaction.confirmTransaction-1

  const error = rpcResponse.value.err;
  if (error) {
    // Can be a string or an object (literally just {}, no further typing is provided by the library)
    // https://github.com/solana-labs/solana-web3.js/blob/4436ba5189548fc3444a9f6efb51098272926945/packages/library-legacy/src/connection.ts#L2930
    // TODO: if still occurs in web3.js 2 (unlikely), fix it.
    if (typeof error === "object") {
      const errorKeys = Object.keys(error);
      if (errorKeys.length === 1) {
        if (errorKeys[0] !== "InstructionError") {
          throw new Error(`Unknown RPC error: ${error}`);
        }
        // @ts-ignore due to missing typing information mentioned above.
        const instructionError = error["InstructionError"];
        // An instruction error is a custom program error and looks like:
        // [
        //   1,
        //   {
        //     "Custom": 1
        //   }
        // ]
        // See also https://solana.stackexchange.com/a/931/294
        throw new Error(
          `Error in transaction: instruction index ${instructionError[0]}, custom program error ${instructionError[1]["Custom"]}`
        );
      }
    }
    throw Error(error.toString());
  }
};
