define(['knockout', 'text!./login-page.html', "i18n!./nls/login"], function(ko, templateMarkup, strings) {

  function LoginPage(params) {
	console.log(strings);
	this.activeText = function(){
		console.log(arguments);
		return {
			login_title: strings.red
		}
	}
    this.message = ko.observable('Hello from the login-page component!');
  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  LoginPage.prototype.dispose = function() { };
  
  return { viewModel: LoginPage, template: templateMarkup };

});
