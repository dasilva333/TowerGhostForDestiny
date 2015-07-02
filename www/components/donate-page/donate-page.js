define(['knockout', 'text!./donate-page.html'], function(ko, templateMarkup) {

  function DonatePage(params) {
    this.message = ko.observable('Hello from the donate-page component!');
  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  DonatePage.prototype.dispose = function() { };
  
  return { viewModel: DonatePage, template: templateMarkup };

});
