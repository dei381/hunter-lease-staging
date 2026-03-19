// Simple content script to detect prices on dealer pages
console.log('Hunter Lease Auditor active');

function findPrices() {
  const bodyText = document.body.innerText;
  const priceRegex = /\$\d{1,3}(,\d{3})*(\.\d{2})?/g;
  const matches = bodyText.match(priceRegex);
  
  if (matches) {
    chrome.runtime.sendMessage({
      type: 'PRICES_FOUND',
      prices: matches.slice(0, 10)
    });
  }
}

// Run periodically
setInterval(findPrices, 5000);
