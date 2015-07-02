define(['knockout', 'text!./settings-page.html'], function(ko, templateMarkup) {

  function SettingsPage(params) {
    this.message = ko.observable('Hello from the settings-page component!');
  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  SettingsPage.prototype.dispose = function() { };
  
  return { viewModel: SettingsPage, template: templateMarkup };

});
