// Manifest V3 service worker: opens Wyzard Studio in a full browser tab when the extension icon is clicked.
if (typeof chrome !== 'undefined' && chrome.action && chrome.tabs) {
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('index.html'),
    });
  });
}
