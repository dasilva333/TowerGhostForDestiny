window.ua = navigator.userAgent;
window.isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor) && typeof chrome != "undefined";
window.isMobile = (/ios|iphone|ipod|ipad|android|iemobile/i.test(ua));
window.isWindowsPhone = (/iemobile/i.test(ua));
window.isKindle = /Kindle/i.test(ua) || /Silk/i.test(ua) || /KFTT/i.test(ua) || /KFOT/i.test(ua) || /KFJWA/i.test(ua) || /KFJWI/i.test(ua) || /KFSOWI/i.test(ua) || /KFTHWA/i.test(ua) || /KFTHWI/i.test(ua) || /KFAPWA/i.test(ua) || /KFAPWI/i.test(ua);
window.supportsCloudSaves = window.isChrome || window.isMobile;

define(['jquery', 'knockout', './router', 'bootstrap', 'knockout-projections', './bindingHandlers'], function($, ko, router) {

  // Components can be packaged as AMD modules, such as the following:
  ko.components.register('nav-bar', { require: 'components/nav-bar/nav-bar' });
  ko.components.register('home-page', { require: 'components/home-page/home' });

  // ... or for template-only components, you can just point to a .html file directly:
  ko.components.register('about-page', {
    template: { require: 'text!components/about-page/about.html' }
  });

  ko.components.register('login-page', { require: 'components/login-page/login-page' });


  ko.components.register('help-page', { require: 'components/help-page/help-page' });


  ko.components.register('donate-page', { require: 'components/donate-page/donate-page' });


  ko.components.register('settings-page', { require: 'components/settings-page/settings-page' });

  ko.components.register('items', { require: 'components/items/items' });
  // [Scaffolded component registrations will be inserted here. To retain this feature, don't remove this comment.]

  // Start the application
  ko.applyBindings({ route: router.currentRoute });
});
