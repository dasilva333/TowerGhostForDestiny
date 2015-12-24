window.ua = navigator.userAgent;
window.isNWJS = (typeof require != "undefined");
window.isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor) && typeof chrome != "undefined";
window.isFirefox = (/firefox/i.test(ua));
window.isIOS = (/ios|iphone|ipod|ipad/i.test(ua));
window.isiPad = (/ipad/i.test(ua));
window.isAndroid = (/android/i.test(ua));
window.isWindowsPhone = (/iemobile/i.test(ua));
window.isMobile = (window.isIOS || window.isAndroid || window.isWindowsPhone);
window.isKindle = /Kindle/i.test(ua) || /Silk/i.test(ua) || /KFTT/i.test(ua) || /KFOT/i.test(ua) || /KFJWA/i.test(ua) || /KFJWI/i.test(ua) || /KFSOWI/i.test(ua) || /KFTHWA/i.test(ua) || /KFTHWI/i.test(ua) || /KFAPWA/i.test(ua) || /KFAPWI/i.test(ua);
window.isStaticBrowser = location.protocol.indexOf("http") > -1 && location.href.indexOf("towerghostfordestiny.com/firefox") == -1;
if (window.isStaticBrowser) {
    window.isMobile = window.isWindowsPhone = window.isAndroid = window.isIOS = window.isFirefox = window.isChrome = window.isNWJS = false;
}
if (typeof window.tgd == "undefined") window.tgd = {};
if (typeof tgd.dataDir == "undefined") tgd.dataDir = "data";
if (isWindowsPhone) {
    window.requestFileSystem = function() {};
}
tgd.localLogging = location.href.indexOf("debug") > -1;
tgd.localLog = function(msg) {
    if (tgd.localLogging) {
        console.log(msg);
    }
};