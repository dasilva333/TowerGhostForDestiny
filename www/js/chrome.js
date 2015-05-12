chrome.browserAction.onClicked.addListener(function(tab) {
    var optionsUrl = chrome.extension.getURL('www/index.html');
    chrome.tabs.query({
        url: optionsUrl
    }, function(tabs) {
        if (tabs.length) {
            chrome.tabs.update(tabs[0].id, {
                active: true
            });
        } else {
            chrome.tabs.create({
                url: optionsUrl
            });
        }
    });
});