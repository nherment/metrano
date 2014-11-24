(function($) {
  $.urlParam = function(name) {
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (!results) { return undefined; }
    return results[1] || undefined;
  }
})(jQuery);
