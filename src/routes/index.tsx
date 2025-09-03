import { PublicKey } from '@solana/web3.js';
import { createAsync } from '@solidjs/router';
import { For, Suspense, createSignal, createEffect, Show } from 'solid-js';
import { toast, Toaster } from 'solid-toast';
import Counter from '~/components/Counter';
import {
  getStakeAccounts,
  getSendSolComputeUnits,
  getSendUsdcComputeUnits,
  getCreateAtaAndSendUsdcComputeUnits,
  getStakeComputeUnits,
  getUnstakeComputeUnits,
  getServerAddresses,
} from '~/server/server';
// Get addresses from server configuration
const serverAddresses = getServerAddresses();
const walletPublicKey = new PublicKey(serverAddresses.walletPublicKey);
const walletUSDCAccount = new PublicKey(serverAddresses.walletUSDCAccount);
const monitorWallet = new PublicKey(serverAddresses.monitorWallet);
const votePubkey = new PublicKey(serverAddresses.votePubkey);
const stakePubkey = new PublicKey(serverAddresses.stakePubkey);

// Define types for logged data
interface LogEntry {
  id: number;
  category:
    | 'Address'
    | 'Compute Units'
    | 'Stake'
    | 'Process'
    | 'Transaction'
    | 'Error';
  label: string;
  data: string;
  timestamp: string;
}

// Define transaction data interface
interface TransactionData {
  name: string;
  base64: string;
  computeUnits: number | null;
  description: string;
}

export default function Home() {
  // State for collecting all logged data
  const [loggedData, setLoggedData] = createSignal<LogEntry[]>([]);

  // State for transaction data
  const [transactionData, setTransactionData] = createSignal<TransactionData[]>(
    []
  );

  // Helper function to add data to logs and console
  const addToLogs = (
    category: LogEntry['category'],
    label: string,
    data: any
  ): any => {
    const logEntry: LogEntry = {
      id: Date.now() + Math.random(),
      category,
      label,
      data:
        typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data),
      timestamp: new Date().toLocaleTimeString(),
    };
    setLoggedData((prev) => [...prev, logEntry]);
    console.log(`${category} - ${label}:`, data);
    return data;
  };

  // Add transaction data to collection
  const addTransactionData = (
    name: string,
    base64: string,
    computeUnits: number | null,
    description: string
  ): void => {
    const txData: TransactionData = { name, base64, computeUnits, description };
    setTransactionData((prev) => [...prev, txData]);
    addToLogs(
      'Transaction',
      name,
      `Base64: ${base64}\nCompute Units: ${computeUnits}`
    );
  };

  // Copy to clipboard function with toast
  const copyToClipboard = async (
    text: string,
    label: string
  ): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`📋 Copied ${label} to clipboard!`);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('❌ Failed to copy to clipboard');
    }
  };

  const stakeAccounts = createAsync(async () => {
    try {
      const result = await getStakeAccounts(walletPublicKey.toBase58());
      addToLogs('Stake', 'Stake Accounts', result);
      return result;
    } catch (error) {
      console.error('Error fetching stake accounts:', error);
      addToLogs(
        'Error',
        'Stake Accounts Fetch Failed',
        error instanceof Error ? error.message : String(error)
      );
      toast.error('Failed to fetch stake accounts');
      return null;
    }
  });

  const sendSolComputeUnits = createAsync(async () => {
    try {
      const result = await getSendSolComputeUnits();
      addToLogs('Compute Units', 'Send SOL', result.computeUnits);
      addTransactionData(
        'Send 5_000_000 SOL',
        result.base64,
        result.computeUnits,
        'Transfer 5 SOL from monitor wallet to primary wallet'
      );
      return result.computeUnits;
    } catch (error) {
      console.error('Error simulating SOL transfer:', error);
      addToLogs(
        'Error',
        'SOL Transfer Simulation Failed',
        error instanceof Error ? error.message : String(error)
      );
      toast.error('Failed to simulate SOL transfer');
      return null;
    }
  });

  const sendUsdcComputeUnits = createAsync(async () => {
    try {
      const result = await getSendUsdcComputeUnits();
      addToLogs('Compute Units', 'Send USDC', result.computeUnits);
      addTransactionData(
        'Send 50_000 USDC',
        result.base64,
        result.computeUnits,
        'Transfer 50,000 USDC tokens with 6 decimal precision'
      );
      return result.computeUnits;
    } catch (error) {
      console.error('Error simulating USDC transfer:', error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addToLogs('Error', 'USDC Transfer Simulation Failed', errorMessage);

      if (errorMessage.includes('insufficient USDC balance')) {
        toast.error('❌ Insufficient USDC balance in wallet');
      } else if (errorMessage.includes('invalid token account')) {
        toast.error(
          '❌ Invalid USDC token account - check wallet configuration'
        );
      } else if (
        errorMessage.includes('TokenOwnerOffCurveError') ||
        errorMessage.includes('Ed25519 curve')
      ) {
        toast.error('❌ Invalid wallet address - not on Ed25519 curve');
      } else {
        toast.error('❌ Failed to simulate USDC transfer');
      }
      return null;
    }
  });

  const createAssociatedTokenAccountAndSendUsdcComputeUnits = createAsync(
    async () => {
      try {
        addToLogs('Process', 'Starting ATA & Send USDC', 'Process initiated');
        const result = await getCreateAtaAndSendUsdcComputeUnits();
        addToLogs(
          'Compute Units',
          'Create ATA & Send USDC',
          result.computeUnits
        );
        addTransactionData(
          'Create ATA & Send 50_000 USDC',
          result.base64,
          result.computeUnits,
          'Create associated token account and transfer 50,000 USDC in one transaction'
        );
        return result.computeUnits;
      } catch (error) {
        console.error('Error simulating ATA & USDC transfer:', error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addToLogs(
          'Error',
          'ATA & USDC Transfer Simulation Failed',
          errorMessage
        );

        if (
          errorMessage.includes('TokenOwnerOffCurveError') ||
          errorMessage.includes('Ed25519 curve')
        ) {
          toast.error('Cannot create ATA: Invalid wallet address provided');
        } else {
          toast.error('Failed to simulate ATA & USDC transfer');
        }
        return null;
      }
    }
  );

  const stakeComputeUnits = createAsync(async () => {
    try {
      const result = await getStakeComputeUnits();
      addToLogs(
        'Compute Units',
        'Stake Creation & Delegation',
        result.computeUnits
      );
      addTransactionData(
        'Create Stake Account & Delegate 5_000_000',
        result.base64,
        result.computeUnits,
        'Create new stake account with 5 SOL and delegate to validator'
      );
      return result.computeUnits;
    } catch (error) {
      console.error('Error simulating stake creation:', error);
      addToLogs(
        'Error',
        'Stake Creation Simulation Failed',
        error instanceof Error ? error.message : String(error)
      );
      toast.error('Failed to simulate stake creation');
      return null;
    }
  });

  const unstakeComputeUnits = createAsync(async () => {
    try {
      const result = await getUnstakeComputeUnits();
      addToLogs(
        'Compute Units',
        'Deactivate Stake Account',
        result.computeUnits
      );
      addTransactionData(
        'Deactivate Stake Account',
        result.base64,
        result.computeUnits,
        'Deactivate existing stake account to prepare for withdrawal'
      );
      return result.computeUnits;
    } catch (error) {
      console.error('Error simulating stake deactivation:', error);
      addToLogs(
        'Error',
        'Stake Deactivation Simulation Failed',
        error instanceof Error ? error.message : String(error)
      );
      toast.error('Failed to simulate stake deactivation');
      return null;
    }
  });

  // Add key addresses to logs when component mounts
  createEffect(() => {
    addToLogs('Address', 'Wallet Public Key', walletPublicKey.toBase58());
    addToLogs('Address', 'Wallet USDC Account', walletUSDCAccount.toBase58());
    addToLogs('Address', 'Monitor Wallet', monitorWallet.toBase58());
    addToLogs('Address', 'Vote Account', votePubkey.toBase58());
    addToLogs('Address', 'Stake Account', stakePubkey.toBase58());
  });

  return (
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />

      {/* Header */}
      <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-4">
              <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg"></div>
              <h1 class="text-2xl font-bold text-gray-900">
                Solana Web3 Sandbox
              </h1>
            </div>
            <div class="text-sm text-gray-500">
              {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </header>

      <div class="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Wallet Info Card */}
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <div class="w-5 h-5 bg-green-500 rounded-full mr-3"></div>
            Wallet Information
          </h2>
          <div class="bg-gray-50 rounded-lg p-4 font-mono text-sm">
            <div class="flex items-center justify-between">
              <span class="text-gray-600">Primary Wallet:</span>
              <div class="flex items-center space-x-2">
                <span class="text-gray-900">{walletPublicKey.toBase58()}</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      walletPublicKey.toBase58(),
                      'Wallet Address'
                    )
                  }
                  class="p-1 text-blue-500 hover:text-blue-700 transition-colors"
                  title="Copy to clipboard"
                >
                  📋
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Compute Units Dashboard */}
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <div class="w-5 h-5 bg-blue-500 rounded-full mr-3"></div>
            Transaction Compute Units
          </h2>

          <Suspense
            fallback={
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div class="animate-pulse bg-gray-200 rounded-lg h-24"></div>
                ))}
              </div>
            }
          >
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-green-800">Send SOL</h3>
                    <p class="text-2xl font-bold text-green-900">
                      {sendSolComputeUnits() !== null &&
                      sendSolComputeUnits() !== undefined
                        ? sendSolComputeUnits()?.toLocaleString()
                        : '...'}
                    </p>
                    <p class="text-xs text-green-600">compute units</p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        String(sendSolComputeUnits() || ''),
                        'Send SOL Compute Units'
                      )
                    }
                    class="p-2 text-green-600 hover:text-green-800 transition-colors"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-blue-800">Send USDC</h3>
                    <p class="text-2xl font-bold text-blue-900">
                      {sendUsdcComputeUnits() !== null &&
                      sendUsdcComputeUnits() !== undefined
                        ? sendUsdcComputeUnits()?.toLocaleString()
                        : '...'}
                    </p>
                    <p class="text-xs text-blue-600">compute units</p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        String(sendUsdcComputeUnits() || ''),
                        'Send USDC Compute Units'
                      )
                    }
                    class="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div class="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-purple-800">
                      Create ATA & Send USDC
                    </h3>
                    <p class="text-2xl font-bold text-purple-900">
                      {createAssociatedTokenAccountAndSendUsdcComputeUnits() !==
                        null &&
                      createAssociatedTokenAccountAndSendUsdcComputeUnits() !==
                        undefined
                        ? createAssociatedTokenAccountAndSendUsdcComputeUnits()?.toLocaleString()
                        : '...'}
                    </p>
                    <p class="text-xs text-purple-600">compute units</p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        String(
                          createAssociatedTokenAccountAndSendUsdcComputeUnits() ||
                            ''
                        ),
                        'Create ATA & Send USDC Compute Units'
                      )
                    }
                    class="p-2 text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div class="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-orange-800">
                      Stake Creation
                    </h3>
                    <p class="text-2xl font-bold text-orange-900">
                      {stakeComputeUnits() !== null &&
                      stakeComputeUnits() !== undefined
                        ? stakeComputeUnits()?.toLocaleString()
                        : '...'}
                    </p>
                    <p class="text-xs text-orange-600">compute units</p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        String(stakeComputeUnits() || ''),
                        'Stake Compute Units'
                      )
                    }
                    class="p-2 text-orange-600 hover:text-orange-800 transition-colors"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div class="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                <div class="flex items-center justify-between">
                  <div>
                    <h3 class="text-sm font-medium text-red-800">Unstake</h3>
                    <p class="text-2xl font-bold text-red-900">
                      {unstakeComputeUnits() !== null &&
                      unstakeComputeUnits() !== undefined
                        ? unstakeComputeUnits()?.toLocaleString()
                        : '...'}
                    </p>
                    <p class="text-xs text-red-600">compute units</p>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(
                        String(unstakeComputeUnits() || ''),
                        'Unstake Compute Units'
                      )
                    }
                    class="p-2 text-red-600 hover:text-red-800 transition-colors"
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>
          </Suspense>
        </div>

        {/* Stake Accounts */}
        <div class="bg-white rounded-lg shadow-md p-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <div class="w-5 h-5 bg-yellow-500 rounded-full mr-3"></div>
            Stake Accounts
          </h2>

          <Suspense
            fallback={
              <div class="animate-pulse bg-gray-200 rounded-lg h-32 flex items-center justify-center">
                <p class="text-gray-500">Loading stake accounts...</p>
              </div>
            }
          >
            <div class="space-y-4">
              <Show
                when={stakeAccounts()?.accts?.length}
                fallback={
                  <div class="text-center py-8 text-gray-500">
                    <p>No stake accounts found or failed to load.</p>
                  </div>
                }
              >
                <For each={stakeAccounts()?.accts}>
                  {(account) => (
                    <div class="bg-gray-50 rounded-lg p-4 border">
                      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Account
                          </label>
                          <div class="flex items-center justify-between mt-1">
                            <p class="font-mono text-sm text-gray-900 truncate">
                              {account.account}
                            </p>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  account.account,
                                  'Stake Account'
                                )
                              }
                              class="ml-2 p-1 text-blue-500 hover:text-blue-700 transition-colors"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                        <div>
                          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Lamports
                          </label>
                          <div class="flex items-center justify-between mt-1">
                            <p class="text-sm font-semibold text-gray-900">
                              {account.lamports.toLocaleString()}
                            </p>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  String(account.lamports),
                                  'Lamports'
                                )
                              }
                              class="ml-2 p-1 text-blue-500 hover:text-blue-700 transition-colors"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                        <div>
                          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            SOL Value
                          </label>
                          <p class="text-sm font-semibold text-green-600 mt-1">
                            ◎ {(account.lamports / 1000000000).toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </Suspense>
        </div>

        {/* Transaction Data Section */}
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900 flex items-center">
              <div class="w-5 h-5 bg-purple-500 rounded-full mr-3"></div>
              Transaction Data ({transactionData().length} transactions)
            </h2>
            <button
              onClick={() => setTransactionData([])}
              class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div class="space-y-4">
            <For each={transactionData()}>
              {(transaction) => (
                <div class="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-6 border">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                      <h3 class="text-lg font-semibold text-gray-900 mb-1">
                        {transaction.name}
                      </h3>
                      <p class="text-sm text-gray-600 mb-3">
                        {transaction.description}
                      </p>

                      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Compute Units
                          </label>
                          <div class="flex items-center justify-between mt-1 bg-white rounded-lg p-3 border">
                            <span class="text-lg font-bold text-green-600">
                              {transaction.computeUnits?.toLocaleString() ||
                                'N/A'}
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  String(transaction.computeUnits),
                                  `${transaction.name} Compute Units`
                                )
                              }
                              class="p-1 text-green-600 hover:text-green-800 transition-colors"
                              title="Copy compute units"
                            >
                              📋
                            </button>
                          </div>
                        </div>

                        <div>
                          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            Base64 Transaction
                          </label>
                          <div class="flex items-center justify-between mt-1 bg-white rounded-lg p-3 border">
                            <span class="font-mono text-xs text-gray-700 truncate max-w-xs">
                              {transaction.base64.substring(0, 50)}...
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  transaction.base64,
                                  `${transaction.name} Base64`
                                )
                              }
                              class="p-1 text-blue-600 hover:text-blue-800 transition-colors ml-2"
                              title="Copy full base64 transaction"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      </div>

                      <div class="mt-4">
                        <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Full Base64 Transaction Data
                        </label>
                        <div class="mt-1 bg-white rounded-lg p-3 border">
                          <div class="flex items-start justify-between">
                            <pre class="text-xs font-mono text-gray-700 whitespace-pre-wrap break-all flex-1 mr-4">
                              {transaction.base64}
                            </pre>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  transaction.base64,
                                  `${transaction.name} Full Transaction`
                                )
                              }
                              class="p-2 text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0"
                              title="Copy full transaction data"
                            >
                              📋
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2 pt-4 border-t">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `${transaction.name}: ${transaction.computeUnits} compute units`,
                          `${transaction.name} Summary`
                        )
                      }
                      class="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      📋 Copy Summary
                    </button>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          JSON.stringify(transaction, null, 2),
                          `${transaction.name} JSON`
                        )
                      }
                      class="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                    >
                      📋 Copy as JSON
                    </button>
                  </div>
                </div>
              )}
            </For>

            {transactionData().length === 0 && (
              <div class="text-center py-8 text-gray-500">
                <p>
                  No transaction data captured yet. Run the compute unit
                  calculations above to see transaction data.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Logged Data */}
        <div class="bg-white rounded-lg shadow-md p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-semibold text-gray-900 flex items-center">
              <div class="w-5 h-5 bg-indigo-500 rounded-full mr-3"></div>
              Live Data Log ({loggedData().length} entries)
            </h2>
            <button
              onClick={() => setLoggedData([])}
              class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Clear All
            </button>
          </div>

          <div class="space-y-3 max-h-96 overflow-y-auto">
            <For each={loggedData().slice().reverse()}>
              {(log) => (
                <div class="bg-gray-50 rounded-lg p-4 border">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center space-x-2 mb-2">
                        <span
                          class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            log.category === 'Address'
                              ? 'bg-blue-100 text-blue-800'
                              : log.category === 'Compute Units'
                                ? 'bg-green-100 text-green-800'
                                : log.category === 'Stake'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : log.category === 'Process'
                                    ? 'bg-purple-100 text-purple-800'
                                    : log.category === 'Transaction'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {log.category}
                        </span>
                        <span class="text-sm font-medium text-gray-900">
                          {log.label}
                        </span>
                        <span class="text-xs text-gray-500">
                          {log.timestamp}
                        </span>
                      </div>
                      <div class="bg-white rounded border p-3">
                        <pre class="text-sm text-gray-800 whitespace-pre-wrap break-all font-mono">
                          {log.data}
                        </pre>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(log.data, log.label)}
                      class="ml-4 p-2 text-blue-500 hover:text-blue-700 transition-colors flex-shrink-0"
                      title={`Copy ${log.label}`}
                    >
                      📋
                    </button>
                  </div>
                </div>
              )}
            </For>

            {loggedData().length === 0 && (
              <div class="text-center py-8 text-gray-500">
                <p>
                  No data logged yet. Interact with the functions above to see
                  live data.
                </p>
              </div>
            )}
          </div>
        </div>

        <Counter />
      </div>
    </div>
  );
}
