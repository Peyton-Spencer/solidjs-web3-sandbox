'use server';
import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  RpcResponseAndContext,
  SignatureResult,
  SimulatedTransactionResponse,
  StakeProgram,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';

// Define the RPC endpoint and the user's wallet public key
const rpcEndpoint = 'https://api.mainnet-beta.solana.com';

// Create a connection to the Solana network
const connection = new Connection(rpcEndpoint);
const walletEmpty = new PublicKey(
  'C9UDwijirc9K6sbnwYiK7HqoLWMdRSwSHbFu1ypRRM5g'
);
const walletCoinbaseHot1 = new PublicKey(
  'FpwQQhQQoEaVu3WU2qZMfF1hx48YyfwsLoRgXG83E99Q'
);
const tokenAccountCoinbaseHot1USDC = new PublicKey(
  '57TH6kDvVMjdRgk3wdLEHFbxPpYdGGVn89Dnz1ndD1S5'
);
const walletCoinbaseHot2 = new PublicKey(
  '2AQdpHJ2JpcEgPiATUXjQxA8QmafFegfQwSLWSprPicm'
);
const tokenAccountCoinbaseHot2USDC = new PublicKey(
  '5SvWZ7EDAhFQwJoJ5iftNF9C2CHpA6DChyZzAnmLupeQ'
);
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const voteAccountKraken = new PublicKey(
  'KRAKEnMdmT4EfM8ykTFH6yLoCd5vNLcQvJwF66Y2dag'
);
const stakeAccountKraken = new PublicKey(
  'GitYucwpNcg6Dx1Y15UQ9TQn8LZMX1uuqQNn8rXxEWNC'
);
const stakingAuthorityKraken = new PublicKey(
  'zvYPtfpDXwEE46C3NeZrKV5SHA416BiK2YabQTceQ8X'
);

// Get the program accounts owned by the Stake Program

export async function getStakeAccounts(pubKeyString: string) {
  const pubKey = new PublicKey(pubKeyString);
  const base58 = pubKey.toBase58();
  const filters = [
    {
      memcmp: {
        offset: 12,
        bytes: base58,
      },
    },
  ];
  const accounts = await connection.getProgramAccounts(StakeProgram.programId, {
    filters,
  });
  // console.log("Stake Accounts:", accounts);
  const accts = accounts.map((account) => ({
    account: account.pubkey.toBase58(),
    lamports: account.account.lamports,
    owner: account.account.owner.toBase58(),
  }));
  return { pubKey: base58, accts };
}

export async function getSimulationComputeUnits(
  // connection: Connection,
  testName: string,
  instructions: Array<TransactionInstruction>,
  payer: PublicKey,
  lookupTables: Array<AddressLookupTableAccount> | []
): Promise<{ computeUnits: number | null; base64: string }> {
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
  // Use Uint8Array and btoa for browser compatibility
  const serialized = testTransaction.serialize();
  const base64String = btoa(String.fromCharCode(...serialized));
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
  return {
    computeUnits: rpcResponse.value.unitsConsumed || null,
    base64: base64String,
  };
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
    if (typeof error === 'object') {
      const errorKeys = Object.keys(error);
      if (errorKeys.length === 1) {
        if (errorKeys[0] !== 'InstructionError') {
          throw new Error(`Unknown RPC error: ${error}`);
        }
        // @ts-ignore due to missing typing information mentioned above.
        const instructionError = error['InstructionError'];
        // An instruction error is a custom program error and looks like:
        // [
        //   1,
        //   {
        //     "Custom": 1
        //   }
        // ]
        // See also https://solana.stackexchange.com/a/931/294
        const customError = instructionError[1]['Custom'];
        let errorMessage = `Error in transaction: instruction index ${instructionError[0]}`;

        if (customError !== undefined) {
          errorMessage += `, custom program error ${customError}`;
        }

        // Add specific error messages for common custom program errors
        if (customError === 3) {
          errorMessage +=
            ' (insufficient USDC balance or invalid token account)';
        } else if (customError === 1) {
          errorMessage += ' (invalid instruction data)';
        } else if (customError === 2) {
          errorMessage += ' (invalid account data)';
        } else if (customError === 6) {
          errorMessage += ' (insufficient lamports for rent exemption)';
        } else if (customError === 0) {
          errorMessage += ' (account already exists)';
        }

        throw new Error(errorMessage);
      }
    }
    throw Error(error.toString());
  }
};

// Server-side functions for all Web3 operations
export async function getSendSolComputeUnits() {
  const instructions = [
    SystemProgram.transfer({
      fromPubkey: walletCoinbaseHot1,
      toPubkey: walletCoinbaseHot2,
      lamports: 5_000_000,
    }),
  ];

  return await getSimulationComputeUnits(
    'Send 5_000_000 SOL',
    instructions,
    walletCoinbaseHot1,
    []
  );
}

export async function getCreateAtaAndSendUsdcComputeUnits() {
  // Create a recipient token account (different from sender)
  const recipientTokenAccount = await getAssociatedTokenAddress(
    USDC_MINT,
    walletEmpty
  );

  // First create the recipient's ATA if it doesn't exist
  const createAtaInstruction = createAssociatedTokenAccountInstruction(
    walletCoinbaseHot1, // payer
    recipientTokenAccount, // ata to create
    walletEmpty, // owner
    USDC_MINT // mint
  );

  const transferInstruction = createTransferCheckedInstruction(
    tokenAccountCoinbaseHot1USDC, // from (source token account)
    USDC_MINT, // mint
    recipientTokenAccount, // to (destination token account)
    walletCoinbaseHot1, // from's owner
    50_000, // amount (50k USDC with 6 decimals = 50 USDC)
    6 // decimals
  );

  const instructions = [createAtaInstruction, transferInstruction];

  return await getSimulationComputeUnits(
    'Send 50_000 USDC',
    instructions,
    walletCoinbaseHot1,
    []
  );
}

export async function getSendUsdcComputeUnits() {
  try {
    const transferInstruction = createTransferCheckedInstruction(
      tokenAccountCoinbaseHot1USDC, // from
      USDC_MINT, // mint
      tokenAccountCoinbaseHot2USDC, // to
      walletCoinbaseHot1, // from authority
      50_000, // amount
      6 // decimals
    );

    const instructions = [transferInstruction];

    return await getSimulationComputeUnits(
      'Create ATA & Send 50_000 USDC',
      instructions,
      walletCoinbaseHot1,
      []
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('TokenOwnerOffCurveError')
    ) {
      throw new Error(
        'Cannot create ATA: The owner address is not on the Ed25519 curve. Use a valid Solana wallet address.'
      );
    }
    throw error;
  }
}

export async function getStakeComputeUnits() {
  const seed = 'stake';
  const newAccountPubkey = await PublicKey.createWithSeed(
    walletCoinbaseHot1,
    seed,
    StakeProgram.programId
  );

  const tx = StakeProgram.delegate({
    stakePubkey: newAccountPubkey,
    authorizedPubkey: walletCoinbaseHot1,
    votePubkey: voteAccountKraken,
  });

  const instructions = [
    SystemProgram.createAccountWithSeed({
      basePubkey: walletCoinbaseHot1,
      fromPubkey: walletCoinbaseHot1,
      lamports: 5_000_000,
      newAccountPubkey,
      programId: StakeProgram.programId,
      seed,
      space: 200,
    }),
    StakeProgram.initialize({
      authorized: {
        staker: walletCoinbaseHot1,
        withdrawer: walletCoinbaseHot1,
      },
      lockup: {
        epoch: 0,
        unixTimestamp: 0,
        custodian: SystemProgram.programId,
      },
      stakePubkey: newAccountPubkey,
    }),
    tx.instructions[0],
  ];

  return await getSimulationComputeUnits(
    'Create Stake Account & Delegate 5_000_000',
    instructions,
    walletCoinbaseHot1,
    []
  );
}

export async function getUnstakeComputeUnits() {
  const tx = StakeProgram.deactivate({
    stakePubkey: stakeAccountKraken,
    authorizedPubkey: stakingAuthorityKraken,
  });

  const instructions = [tx.instructions[0]];

  return await getSimulationComputeUnits(
    'Deactivate Stake Account',
    instructions,
    stakingAuthorityKraken,
    []
  );
}

// Function to get all addresses used by the server
export function getServerAddresses() {
  return {
    walletPublicKey: walletCoinbaseHot1.toBase58(),
    walletUSDCAccount: tokenAccountCoinbaseHot1USDC.toBase58(),
    monitorWallet: walletCoinbaseHot1.toBase58(),
    votePubkey: voteAccountKraken.toBase58(),
    stakePubkey: stakeAccountKraken.toBase58(),
  };
}
