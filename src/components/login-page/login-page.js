define(['knockout', 'text!./login-page.html'], function(ko, templateMarkup) {

  function LoginPage(params) {
    this.message = ko.observable('Hello from the login-page component!');
  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  LoginPage.prototype.dispose = function() { };
  
  return { viewModel: LoginPage, template: templateMarkup };

});
