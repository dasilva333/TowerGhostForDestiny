define(['knockout', 'text!./help-page.html', "tk_i18n"], function(ko, templateMarkup, il8n) {

  function HelpPage(params) {
    this.message = ko.observable('Hello from the help-page component!');
  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  HelpPage.prototype.dispose = function() { };
  
  return { viewModel: HelpPage, template: templateMarkup };

});
