define(["knockout", "text!./home.html", "bungie", "tgd", "components/home-page/filters"], function(ko, homeTemplate, bungie, tgd, filters) {

  function HomeViewModel(route) {
	var self = this;
	
	this.tgd = tgd;
	this.filters = filters;
    this.orderedCharacters = ko.computed(function() {
        return bungie.characters().sort(function(a, b) {
            return a.order() - b.order();
        });
    });	
	
	this.xsColumn = ko.computed(new tgd.StoreObj("xsColumn"));
    this.smColumn = ko.computed(new tgd.StoreObj("smColumn"));
    this.mdColumn = ko.computed(new tgd.StoreObj("mdColumn"));
    this.lgColumn = ko.computed(new tgd.StoreObj("lgColumn"));
	this.columnMode = ko.computed(function() {
        return "col-xs-" + self.xsColumn() + " col-sm-" + self.smColumn() + " col-md-" + self.mdColumn() + " col-lg-" + self.lgColumn();
    });
	
	/*if (bungie.isLoggedIn() == true){
		self.message("Logged in as " + bungie.activeUser().id);
	}*/
  }

  HomeViewModel.prototype.doSomething = function() {
    this.message('You invoked doSomething() on the viewmodel.');
  };

  return { viewModel: HomeViewModel, template: homeTemplate };

});
