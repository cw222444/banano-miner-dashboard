export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API proxy — fetch BananoMiner data directly
    if (url.pathname === "/api" && request.method === "POST") {
      const { wallet } = await request.json();
      const res = await fetch(`https://bananominer.com/user_address/${wallet}`, {
        headers: { "User-Agent": "BananoMinerDashboard/1.0" },
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: "Invalid address or network issue." }), {
          headers: { "Content-Type": "application/json" },
          status: 500,
        });
      }
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Serve dashboard UI
    return new Response(
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BananoMiner Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    async function fetchMiner() {
      const wallet = document.getElementById('wallet').value.trim();
      if (!wallet) return alert('Please enter a Banano wallet address');

      document.getElementById('loading').classList.remove('hidden');
      document.getElementById('userInfo').classList.add('hidden');

      const res = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet }),
      });

      document.getElementById('loading').classList.add('hidden');
      if (!res.ok) {
        alert('Failed to fetch data');
        return;
      }

      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }

      const payments = data.payments || [];
      // Sort newest first
      payments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Calculate stats
      const totalBan = payments.reduce((sum, p) => sum + p.amount, 0);
      const latestWork = payments.length ? payments[0].work_units : 0;
      const latestScore = payments.length ? payments[0].score : 0;

      // Populate UI
      document.getElementById('userInfo').classList.remove('hidden');
      document.getElementById('walletName').textContent = data.user.name;
      document.getElementById('created').textContent = new Date(data.user.created_at).toLocaleString();
      document.getElementById('totalBan').textContent = totalBan.toFixed(2) + ' BAN';
      document.getElementById('totalWork').textContent = latestWork.toLocaleString();
      document.getElementById('totalScore').textContent = latestScore.toLocaleString();

      const table = document.getElementById('history');
      table.innerHTML = '';
      payments.slice(0, 10).forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = \`
          <td class="px-4 py-2 whitespace-nowrap">\${new Date(p.created_at).toLocaleString()}</td>
          <td class="px-4 py-2 whitespace-nowrap">\${p.amount.toFixed(2)} BAN</td>
          <td class="px-4 py-2 whitespace-nowrap">\${p.score.toLocaleString()}</td>
          <td class="px-4 py-2 whitespace-nowrap">\${p.work_units.toLocaleString()}</td>
          <td class="px-4 py-2 whitespace-nowrap text-yellow-400">
            <a href="https://creeper.banano.cc/explorer/block/\${p.block_hash}" target="_blank" class="hover:underline">View</a>
          </td>
        \`;
        table.appendChild(row);
      });
    }
  </script>
</head>

<body class="bg-gray-950 text-gray-100 flex flex-col items-center min-h-screen p-6">
  <h1 class="text-3xl font-bold mb-6 text-yellow-400">🍌 BananoMiner Dashboard</h1>

  <!-- Input Section -->
  <div class="bg-gray-900 p-6 rounded-2xl shadow-md w-full max-w-md">
    <input id="wallet" type="text" placeholder="Enter your Banano wallet address" 
      class="w-full p-2 rounded-md mb-4 bg-gray-800 text-gray-200 focus:ring-2 focus:ring-yellow-400 text-sm break-all"/>
    <button onclick="fetchMiner()" 
      class="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-md w-full font-semibold">
      Fetch Stats
    </button>
    <div id="loading" class="hidden text-center mt-3 text-gray-400">Loading...</div>
  </div>

  <!-- Info Cards -->
  <div id="userInfo" class="hidden w-full max-w-3xl mt-10">
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center mb-8">
      <div class="bg-gray-900 p-4 rounded-xl overflow-hidden">
        <h3 class="text-sm text-gray-400">Wallet</h3>
        <p id="walletName" class="text-xs font-bold mt-1 truncate">-</p>
      </div>
      <div class="bg-gray-900 p-4 rounded-xl overflow-hidden">
        <h3 class="text-sm text-gray-400">Created</h3>
        <p id="created" class="text-xs font-bold mt-1 truncate">-</p>
      </div>
      <div class="bg-gray-900 p-4 rounded-xl overflow-hidden">
        <h3 class="text-sm text-gray-400">Total BAN</h3>
        <p id="totalBan" class="text-2xl font-bold mt-1 truncate">-</p>
      </div>
      <div class="bg-gray-900 p-4 rounded-xl overflow-hidden">
        <h3 class="text-sm text-gray-400">Total Work Units</h3>
        <p id="totalWork" class="text-2xl font-bold mt-1 truncate">-</p>
      </div>
      <div class="bg-gray-900 p-4 rounded-xl overflow-hidden">
        <h3 class="text-sm text-gray-400">Total Score</h3>
        <p id="totalScore" class="text-2xl font-bold mt-1 truncate">-</p>
      </div>
    </div>

    <!-- Table -->
    <h2 class="text-lg font-semibold mb-3 text-yellow-400">Last 10 Payouts</h2>
    <div class="overflow-x-auto">
      <table class="min-w-full bg-gray-900 rounded-xl overflow-hidden text-sm">
        <thead class="bg-gray-800 text-gray-300">
          <tr>
            <th class="px-4 py-2 text-left">Date</th>
            <th class="px-4 py-2 text-left">Amount</th>
            <th class="px-4 py-2 text-left">Score</th>
            <th class="px-4 py-2 text-left">WUs</th>
            <th class="px-4 py-2 text-left">Tx</th>
          </tr>
        </thead>
        <tbody id="history"></tbody>
      </table>
    </div>
  </div>

  <!-- Footer -->
  <footer class="mt-12 text-gray-500 text-sm text-center opacity-80">
    <p>Made by <span class="text-yellow-400 font-semibold">cw222444</span></p>
    <p>
      <a href="https://github.com/cw222444/banano-miner-dashboard" target="_blank" class="hover:text-yellow-400 hover:underline">
        github
      </a>
    </p>
  </footer>
</body>
</html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
};
