chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'PRICES_FOUND') {
    const priceEl = document.getElementById('price');
    if (priceEl && message.prices.length > 0) {
      priceEl.innerText = message.prices[0];
    }
  }
});
