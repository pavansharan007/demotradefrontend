const stocks = {
  TATASTEEL: { price: 100, qty: 0, history: [100], ratings: [], comments: [] },
  INFY: { price: 1500, qty: 0, history: [1500], ratings: [], comments: [] },
  RELIANCE: { price: 2500, qty: 0, history: [2500], ratings: [], comments: [] },
  HDFCBANK: { price: 1650, qty: 0, history: [1650], ratings: [], comments: [] },
  ITC: { price: 400, qty: 0, history: [400], ratings: [], comments: [] },
};

let balance = 100000;
let liveChart;
let selectedSymbol = null;
const USER_ID = "demoUser";
const API_BASE = "https://demotradebackend.onrender.com";

const stockTableBody = document.getElementById("stockTableBody");
const balanceLabel = document.getElementById("balance");
const portfolioDiv = document.getElementById("portfolio");
const liveTicker = document.getElementById("liveTicker");
const liveChartCanvas = document.getElementById("liveChartCanvas").getContext("2d");
const selectedCompanyLabel = document.getElementById("selectedCompany");

function renderStockTable() {
  stockTableBody.innerHTML = "";
  for (const symbol in stocks) {
    const s = stocks[symbol];
    stockTableBody.innerHTML += `
      <tr>
        <td><strong>${symbol}</strong></td>
        <td id="price-${symbol}">${s.price.toFixed(2)}</td>
        <td><input type="number" min="0" id="buy-${symbol}" value="0"></td>
        <td><input type="number" min="0" id="sell-${symbol}" value="0"></td>
        <td><input type="number" min="1" max="5" id="rate-${symbol}" placeholder="★"></td>
        <td><textarea id="comment-${symbol}" rows="1" placeholder="Comment"></textarea></td>
      </tr>
    `;
  }
}

function simulatePrices() {
  for (const symbol in stocks) {
    const stock = stocks[symbol];
    const change = (Math.random() - 0.5) * 4;
    stock.price = Math.max(1, stock.price + change);
    stock.history.push(stock.price);
    if (stock.history.length > 30) stock.history.shift();
    document.getElementById(`price-${symbol}`).textContent = stock.price.toFixed(2);
  }
  updatePortfolioDisplay();
  updateLiveTicker();
  if (selectedSymbol) drawLiveChart(selectedSymbol);
}

function updateLiveTicker() {
  liveTicker.innerHTML = "";
  for (const symbol in stocks) {
    const stock = stocks[symbol];
    const span = document.createElement("span");
    span.innerHTML = `${symbol}: ₹${stock.price.toFixed(2)}`;
    span.style.color = "#0f0";
    span.onclick = () => {
      selectedSymbol = symbol;
      selectedCompanyLabel.textContent = symbol;
      document.getElementById("liveChartContainer").style.display = "block";
      drawLiveChart(symbol);
    };
    liveTicker.appendChild(span);
  }
}

function drawLiveChart(symbol) {
  const stock = stocks[symbol];
  if (liveChart) liveChart.destroy();
  liveChart = new Chart(liveChartCanvas, {
    type: 'line',
    data: {
      labels: Array.from({ length: stock.history.length }, (_, i) => i + 1),
      datasets: [{
        label: `${symbol} Price ₹`,
        data: stock.history,
        borderColor: '#ff9900',
        fill: false,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: false } }
    }
  });
}

function updatePortfolioDisplay() {
  portfolioDiv.innerHTML = "";
  for (const symbol in stocks) {
    const stock = stocks[symbol];
    if (stock.qty > 0 || stock.comments.length > 0) {
      const container = document.createElement("div");
      container.className = "portfolio-item";
      container.innerHTML = `
        <h3>${symbol}</h3>
        <p>Owned: ${stock.qty} shares</p>
        <p>Value: ₹${(stock.qty * stock.price).toFixed(2)}</p>
        <p>Avg Rating: ${getAvg(stock.ratings)} ⭐</p>
        <div class="rating-section">
          <strong>Comments:</strong><br>
          ${stock.comments.map(c => `💬 ${c}`).join("<br>") || "No comments yet"}
        </div>
      `;
      portfolioDiv.appendChild(container);
    }
  }
  balanceLabel.textContent = balance.toFixed(2);
}

function getAvg(arr) {
  if (!arr.length) return "N/A";
  return (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
}

// 🔁 Save portfolio to backend
async function savePortfolioToServer() {
  const payload = {
    balance,
    stocks: {}
  };
  for (const symbol in stocks) {
    payload.stocks[symbol] = {
      qty: stocks[symbol].qty,
      ratings: stocks[symbol].ratings,
      comments: stocks[symbol].comments
    };
  }
  try {
    await fetch(`${API_BASE}/portfolio/${USER_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error("Failed to save portfolio:", err);
  }
}

// ⬇️ Load portfolio from backend
async function loadPortfolioFromServer() {
  try {
    const res = await fetch(`${API_BASE}/portfolio/${USER_ID}`);
    const data = await res.json();
    balance = data.balance;
    for (const symbol in data.stocks) {
      if (stocks[symbol]) {
        stocks[symbol].qty = data.stocks[symbol].qty;
        stocks[symbol].ratings = data.stocks[symbol].ratings || [];
        stocks[symbol].comments = data.stocks[symbol].comments || [];
      }
    }
    updatePortfolioDisplay();
  } catch (err) {
    console.error("Failed to load portfolio:", err);
  }
}

// 🎯 On trade form submission
document.getElementById("stockForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  for (const symbol in stocks) {
    const stock = stocks[symbol];
    const buyQty = parseInt(document.getElementById(`buy-${symbol}`).value) || 0;
    const sellQty = parseInt(document.getElementById(`sell-${symbol}`).value) || 0;
    const rate = parseInt(document.getElementById(`rate-${symbol}`).value);
    const comment = document.getElementById(`comment-${symbol}`).value.trim();

    const buyCost = buyQty * stock.price;
    if (buyQty > 0) {
      if (balance >= buyCost) {
        balance -= buyCost;
        stock.qty += buyQty;
      } else {
        alert(`Not enough balance for ${symbol}`);
      }
    }

    if (sellQty > 0) {
      if (stock.qty >= sellQty) {
        stock.qty -= sellQty;
        balance += sellQty * stock.price;
      } else {
        alert(`Not enough ${symbol} shares to sell`);
      }
    }

    if (rate >= 1 && rate <= 5) stock.ratings.push(rate);
    if (comment) stock.comments.push(comment);
  }

  renderStockTable();
  updatePortfolioDisplay();
  await savePortfolioToServer();
});

// ⏱ Startup
renderStockTable();
updatePortfolioDisplay();
updateLiveTicker();
loadPortfolioFromServer();
setInterval(simulatePrices, 3000);
