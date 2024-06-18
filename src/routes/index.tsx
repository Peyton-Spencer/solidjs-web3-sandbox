import { createTransferCheckedInstruction } from "@solana/spl-token";
import { PublicKey, StakeProgram, SystemProgram } from "@solana/web3.js";
import { createAsync } from "@solidjs/router";
import { For, Suspense } from "solid-js";
import Counter from "~/components/Counter";
import { getSimulationComputeUnits, getStakeAccounts } from "~/server/server";
const walletPublicKey = new PublicKey(process.env.VITE_WALLET as string);
const walletUSDCAccount = new PublicKey(process.env.VITE_TOKEN_ACCOUNT_USDC as string);
const monitorWallet = new PublicKey(process.env.VITE_MONITOR_WALLET as string);
const votePubkey = new PublicKey(process.env.VITE_VOTE_ACCOUNT as string);
const stakePubkey = new PublicKey(process.env.VITE_STAKE_ACCOUNT as string);

export default function Home() {
  const stakeAccounts = createAsync(async () => await getStakeAccounts(walletPublicKey))

  const sendSolComputeUnits = createAsync(async () => {
    return await getSimulationComputeUnits(
      "Send 5_000_000 SOL",
      [SystemProgram.transfer({
        fromPubkey: monitorWallet,
        toPubkey: walletPublicKey,
        lamports: 5_000_000,
      })],
      monitorWallet,
      [])
  })

  const sendUsdcComputeUnits = createAsync(async () => {
    const usdcPublicKey = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
    return await getSimulationComputeUnits(
      "Send 50_000 USDC",
      [createTransferCheckedInstruction(
        walletUSDCAccount,
        usdcPublicKey,
        walletUSDCAccount,
        walletPublicKey,
        50_000,
        6,
      )],
      walletPublicKey,
      [])
  })

  const stakeComputeUnits = createAsync(async () => {
    const seed = "stake";
    const newAccountPubkey = await PublicKey.createWithSeed(monitorWallet, seed, StakeProgram.programId);

    const tx = StakeProgram.delegate({
      stakePubkey: newAccountPubkey,
      authorizedPubkey: monitorWallet,
      votePubkey,
    })
    const instructions = [
      SystemProgram.createAccountWithSeed({
        basePubkey: monitorWallet,
        fromPubkey: monitorWallet,
        // lamports: 2_282_880, // minimum required
        lamports: 5_000_000,
        newAccountPubkey,
        programId: StakeProgram.programId,
        seed,
        space: 200,
      }),
      StakeProgram.initialize({
        authorized: {
          staker: monitorWallet,
          withdrawer: monitorWallet,
        },
        lockup: {
          epoch: 0,
          unixTimestamp: 0,
          custodian: SystemProgram.programId,
        },
        stakePubkey: newAccountPubkey,
      }),
      tx.instructions[0],
    ]

    return await getSimulationComputeUnits(
      "Create Stake Account & Delegate 5_000_000",
      instructions,
      monitorWallet,
      [])
  })

  const unstakeComputeUnits = createAsync(async () => {
    const tx = StakeProgram.deactivate({
      stakePubkey,
      authorizedPubkey: walletPublicKey,
    })
    const instructions = [
      tx.instructions[0],
    ]

    return await getSimulationComputeUnits(
      "Deactivate Stake Account",
      instructions,
      walletPublicKey,
      [])
  }
  )


  return (
    <main class="text-center mx-auto text-gray-700 p-4">
      <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
        <div class="flex justify-center items-center">
          <span class="mr-5">Hello</span> <img class="w-12 h-12" src="https://unocss.dev/logo.svg" alt="UnoCSS logo" />!
        </div>
      </h1>

      <h1>Wallet: {walletPublicKey.toBase58()}</h1>
      <Suspense fallback={<p>Loading Compute Units...</p>}>
        <p>Send SOL Compute Units: {sendSolComputeUnits()}</p>
        <p>Send USDC Compute Units: {sendUsdcComputeUnits()}</p>
        <p>Stake Compute Units: {stakeComputeUnits()}</p>
        <p>Unstake Compute Units: {unstakeComputeUnits()}</p>
      </Suspense>

      <Suspense fallback={<p>Loading Stake Accounts...</p>}>
        <div class="text-left">
          <p>Your Account: {stakeAccounts()?.pubKey}</p>
          <For each={stakeAccounts()?.accts}>{
            (account) => <div>
              <p>Account: {account.account}</p>
              <p>Lamports: {account.lamports}</p>
            </div>
          }</For>
        </div>
      </Suspense>

      <Counter />
    </main >
  );
}

