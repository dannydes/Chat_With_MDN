// ------------------------------------------------------------------
// use helper functions to hook up the main object so "this"
// works in the explorer object
// ------------------------------------------------------------------

function main_startup() {
  main.startup();
}

function main_shutdown() {
  main.shutdown();
}


// ------------------------------------------------------------------
// attach to window events so main object can startup / shutdown
// ------------------------------------------------------------------

window.addEventListener("load", main_startup, false);
window.addEventListener("unload", main_shutdown, false);


// ------------------------------------------------------------------
// main object
// ------------------------------------------------------------------

var main = {
  initialized : false,

  _handleWindowClose : function(event) {
    // handler for clicking on the 'x' to close the window
    return this.shutdownQuery();
  },

  _initSidebar : function(sidebarID) {
    if (sidebarID) {
      var sidebar = document.getElementById(sidebarID);
      var sidebarDeck = document.getElementById("sidebar_deck");
      sidebarDeck.selectedPanel = sidebar;
      var sidebarTitle = document.getElementById("sidebar_title");
      sidebarTitle.value = sidebar.getAttribute("label");
    }
  },

  toggleSidebar : function(sidebarID, forceOpen) {
    var sidebarBox = document.getElementById("sidebar_box");
    var sidebarSplitter = document.getElementById("sidebar_split");
    if (forceOpen || sidebarBox.hidden) {
      sidebarBox.hidden = false;
      sidebarSplitter.hidden = false;

      this._initSidebar(sidebarID);
    }
    else {
      sidebarBox.hidden = true;
      sidebarSplitter.hidden = true;
    }
  },

  startup : function() {
    if (this.initialized)
      return;
    this.initialized = true;

    var self = this;

    window.addEventListener("close", function(event) { self._handleWindowClose(event); }, false);

    // initialize the sidebar
    document.getElementById("sidebar_close").addEventListener("command", function(event) { self.toggleSidebar(null, null); }, false);
    this._initSidebar("sidebar_page1");

    FileController.init(this);
    window.controllers.appendController(FileController);

    ToolsController.init(this);
    window.controllers.appendController(ToolsController);
    HelpController.init(this);
    window.controllers.appendController(HelpController);

  },

  shutdownQuery : function() {
    // do any shutdown checks
    // return false to stop the shutdown
    return true;
  },

  shutdown : function() {
  }
};
