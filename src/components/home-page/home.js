define(["knockout", "text!./home.html","login"], function(ko, homeTemplate, login) {

  function HomeViewModel(route) {
    this.message = ko.observable('Welcome to Tower Ghost For Destiny!');
	if (!login.isLoggedIn())
		location.href = "#";
  }

  HomeViewModel.prototype.doSomething = function() {
    this.message('You invoked doSomething() on the viewmodel.');
  };

  return { viewModel: HomeViewModel, template: homeTemplate };

});
