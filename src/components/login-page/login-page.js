define(['knockout', 'text!./login-page.html', "tk_i18n", "fastclick", "bungie"],  function(ko, templateMarkup, il8n, fastclick, bungie) {

  function LoginPage(params) {
	window.bungie = bungie;
	
	this.optionsPlatform = ko.observable("1");
	this.inputEmail = ko.observable("");
	this.inputPassword = ko.observable("");
	
	this.openBungieWindow = function(type){
		return bungie.openWindow(type);
	}
	this.submitLogin = function(form){
		bungie.directLogin( self.inputEmail(), self.inputPassword(), self.optionsPlatform() );
		return false;
	}
  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  LoginPage.prototype.dispose = function() { };
  
  return { viewModel: LoginPage, template: templateMarkup };

});
