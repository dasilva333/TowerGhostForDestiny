define(['knockout', 'text!./items.html', 'tgd'], function(ko, templateMarkup, tgd) {

  function Items(params) {
  	this.tgd = tgd;
    this.message = ko.observable('Hello from the items component!');
  }

  // This runs when the component is torn down. Put here any logic necessary to clean up,
  // for example cancelling setTimeouts or disposing Knockout subscriptions/computeds.
  Items.prototype.dispose = function() { };
  
  return { viewModel: Items, template: templateMarkup };

});
