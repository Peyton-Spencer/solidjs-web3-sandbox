import { createAsync } from "@solidjs/router";
import { For, Show, Suspense } from "solid-js";
import Counter from "~/components/Counter";
import { getStakeAccounts } from "~/server/getStakeAccounts";

export default function Home() {
  const stakeAccounts = createAsync(getStakeAccounts)
  return (
    <main class="text-center mx-auto text-gray-700 p-4">
      <h1 class="max-6-xs text-6xl text-sky-700 font-thin uppercase my-16">
        <div class="flex justify-center items-center">
          <span class="mr-5">Hello</span> <img class="w-12 h-12" src="https://unocss.dev/logo.svg" alt="UnoCSS logo" />!
        </div>
      </h1>
      <Suspense fallback={<p>Loading...</p>}>
        <For each={stakeAccounts()}>{
          (account) => <div class="text-left">
            <p  >Account: {account.account}</p>
            <p>Lamports: {account.lamports}</p>
          </div>
        }</For>
      </Suspense>

      <Counter />
      <p class="mt-8">
        Visit{" "}
        <a
          href="https://solidjs.com"
          target="_blank"
          class="text-sky-600 hover:underline"
        >
          solidjs.com
        </a>{" "}
        to learn how to build Solid apps.
      </p>
      <p class="mt-2">
        Visit{" "}
        <a
          href="https://unocss.dev"
          target="_blank"
          class="text-sky-600 hover:underline"
        >
          unocss.dev
        </a>{" "}
        to learn how to style your app.
      </p>
      <p class="my-4">
        <span>Home</span>
        {" - "}
        <a href="/about" class="text-sky-600 hover:underline">
          About Page
        </a>{" "}
      </p>
    </main >
  );
}
