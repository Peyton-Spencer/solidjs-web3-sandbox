import { createTransferCheckedInstruction } from "@solana/spl-token";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { createAsync } from "@solidjs/router";
import { For, Suspense } from "solid-js";
import Counter from "~/components/Counter";
import { getSimulationComputeUnits, getStakeAccounts } from "~/server/server";
const walletPublicKey = new PublicKey(process.env.VITE_WALLET as string);

export default function Home() {
  const stakeAccounts = createAsync(getStakeAccounts)

  const sendSolComputeUnits = createAsync(async () => {
    return await getSimulationComputeUnits(
      "Send SOL Compute Units",
      [SystemProgram.transfer({
        fromPubkey: walletPublicKey,
        toPubkey: walletPublicKey,
        lamports: 0,
      })],
      walletPublicKey,
      [])
  })

  const sendUsdcComputeUnits = createAsync(async () => {
    return await getSimulationComputeUnits(
      "Send USDC Compute Units",
      [createTransferCheckedInstruction(
        new PublicKey("GZTwiZ4t2KTfpV8bvKGEL3nvXrbiKZEo8zF4639VNUSE"),
        new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
        new PublicKey("GZTwiZ4t2KTfpV8bvKGEL3nvXrbiKZEo8zF4639VNUSE"),
        walletPublicKey,
        50_000,
        6,
      )],
      walletPublicKey,
      [])
  })

  return (
    <main class="text-center mx-auto text-gray-700 p-4">
      <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
        <div class="flex justify-center items-center">
          <span class="mr-5">Hello</span> <img class="w-12 h-12" src="https://unocss.dev/logo.svg" alt="UnoCSS logo" />!
        </div>
      </h1>

      <Suspense fallback={<p>Loading Compute Units...</p>}>
        <p>Send SOL Compute Units: {sendSolComputeUnits()}</p>
        <p>Send USDC Compute Units: {sendUsdcComputeUnits()}</p>
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
