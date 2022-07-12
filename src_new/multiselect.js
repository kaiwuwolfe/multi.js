/**
 * multi.js
 * A user-friendly replacement for select boxes with multiple attribute enabled.
 *
 * Author: Fabian Lindfors
 * License: MIT
 */
var multiselect = (function() {
  var disabled_limit = false; // This will prevent to reset the "disabled" because of the limit at every click

  // Helper function to trigger an event on an element
  var trigger_event = function(type, el) {
    var e = document.createEvent("HTMLEvents");
    e.initEvent(type, false, true);
    el.dispatchEvent(e);
  };

   // Check if there is a limit and if is reached
   var check_limit = function (select, settings) {
    var limit = settings.limit;
    if (limit > -1) {
      // Count current selected
      var selected_count = 0;
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].selected) {
          selected_count++;
        }
      }

      // Reached the limit
      if (selected_count === limit) {
        // kw: check_limit is executed every time after option is toggled so no need to check >=
        this.disabled_limit = true;

        // Trigger the function (if there is)
        if (typeof settings.limit_reached === "function") {
          settings.limit_reached();
        }

        // Disable all non-selected option
        for (var i = 0; i < select.options.length; i++) {
          var opt = select.options[i];

          if (!opt.selected) {
            opt.setAttribute("disabled", true);
          }
        }
      } else if (this.disabled_limit) {
        // Enable options (only if they weren't disabled on init)
        for (var i = 0; i < select.options.length; i++) {
          var opt = select.options[i];

          if (opt.getAttribute("data-origin-disabled") === "false") {
            opt.removeAttribute("disabled");    // we can only remove disabled attribute rather than uncheck it
          }
        }

        this.disabled_limit = false;
      }
    }
  };

  // Toggles the target option on the select
  var toggle_option = function(select, event, settings) {
    var option = select.options[event.target.getAttribute("multi-index")];  // kw: use string for slicing...

    if (option.disabled) {
      return;   // if option.disabled: this row is not selectable...
    }

    option.selected = !option.selected;  // kw: false to true, true to false...

    check_limit(select, settings);

    trigger_event("change", select);
  };

  // Refreshes an already constructed multi.js instance
  var refresh_select = function(select, settings) {
    // Clear columns
    select.wrapper.selected.innerHTML = "";  // kw: clear inner html of the selected block
    select.wrapper.non_selected.innerHTML = "";  // kw: clear inner html of the selected block

    // Add headers to columns
    if (settings.non_selected_header && settings.selected_header) {
      var non_selected_header = document.createElement("div");
      var selected_header = document.createElement("div");

      non_selected_header.className = "header";
      selected_header.className = "header";

      non_selected_header.innerText = settings.non_selected_header;
      selected_header.innerText = settings.selected_header;

      select.wrapper.non_selected.appendChild(non_selected_header);
      select.wrapper.selected.appendChild(selected_header);
    }

    // Get search value
    if (select.wrapper.search) {
      var query = select.wrapper.search.value; // kw: the search input
    }

    // Current group
    var item_group = null;
    var current_optgroup = null;

    // Loop over select options and add to the non-selected and selected columns
    for (var i = 0; i < select.options.length; i++) {
      var option = select.options[i];

      var value = option.value;
      var label = option.textContent || option.innerText;
      // kw: ? what's the difference between textContent, innerText, text, and value...

      var row = document.createElement("a");
      row.tabIndex = 0;  // kw: make it tabbable
      row.className = "item";
      row.innerText = label;
      row.setAttribute("role", "button");
      row.setAttribute("data-value", value);
      row.setAttribute("multi-index", i);  // kw: used later...

      if (option.disabled) {
        row.className += " disabled";  // kw: cool
      }

      // Add row to selected column if option selected
      if (option.selected) {
        row.className += " selected";
        var clone = row.cloneNode(true);
        select.wrapper.selected.appendChild(clone);
      }

      // Create group if entering a new optgroup
      if (
        option.parentNode.nodeName == "OPTGROUP" &&
        option.parentNode != current_optgroup  // kw: ? when do we sent parentNode?
      ) {
        current_optgroup = option.parentNode;
        item_group = document.createElement("div");
        item_group.className = "item-group";

        if (option.parentNode.label) {
          var groupLabel = document.createElement("span");
          groupLabel.innerHTML = option.parentNode.label;
          groupLabel.className = "group-label";
          item_group.appendChild(groupLabel);
        }

        select.wrapper.non_selected.appendChild(item_group);
      }

      // Clear group if not inside optgroup
      if (option.parentNode == select) {
        item_group = null;
        current_optgroup = null;
      }

      // Apply search filtering
      if (
        !query ||
        (query && label.toLowerCase().indexOf(query.toLowerCase()) > -1)  // ignore case...
      ) {
        // Append to group if one exists, else just append to wrapper
        if (item_group != null) {
          item_group.appendChild(row);
        } else {
          select.wrapper.non_selected.appendChild(row);
        }
      }
    }

    // Hide empty optgroups
    if (settings.hide_empty_groups) {
      var optgroups = document.getElementsByClassName('item-group');
      for (var i = 0; i < optgroups.length; i++) {
        // Hide optgroup if optgroup only contains a group label
        if (optgroups[i].childElementCount < 2) {  // kw: ?
          optgroups[i].style.display = 'none';  // kw: set style.display to none to hide an element...
        }
      }
    }
  };

  // Intializes and constructs an multi.js instance
  var init = function(select, settings) {
    /**
     * Set up settings (optional parameter) and its default values
     *
     * Default values:
     * enable_search : true
     * search_placeholder : "Search..."
     */
    settings = typeof settings !== "undefined" ? settings : {};

    settings["enable_search"] =
      typeof settings["enable_search"] !== "undefined"    // kw: ? maybe passed an json...
        ? settings["enable_search"]
        : true;
    settings["search_placeholder"] =
      typeof settings["search_placeholder"] !== "undefined"
        ? settings["search_placeholder"]
        : "Search...";
    settings["non_selected_header"] =
      typeof settings["non_selected_header"] !== "undefined"
        ? settings["non_selected_header"]
        : null;
    settings["selected_header"] =
      typeof settings["selected_header"] !== "undefined"
        ? settings["selected_header"]
        : null;
    settings["limit"] =
      typeof settings["limit"] !== "undefined"
        ? parseInt(settings["limit"])
        : -1;
    if (isNaN(settings["limit"])) {
      settings["limit"] = -1;
    }
    settings["hide_empty_groups"] =
      typeof settings["hide_empty_groups"] !== "undefined"
        ? settings["hide_empty_groups"]
        : false;

    // Check if already initalized
    if (select.dataset.multijs != null) {  // kw: ? when is multijs first set to true?
      return;
    }

    // Make sure element is select and multiple is enabled
    if (select.nodeName != "SELECT" || !select.multiple) {  // kw: ? when is multiple first set?
      return;
    }

    // Hide select
    select.style.display = "none";
    select.setAttribute("data-multijs", true);

    // Start constructing selector
    var wrapper = document.createElement("div");
    wrapper.className = "multi-wrapper";

    // Add search bar
    if (settings.enable_search) {
      var search = document.createElement("input");
      search.className = "search-input";
      search.type = "text";
      search.setAttribute("placeholder", settings.search_placeholder);
      search.setAttribute("title", settings.search_placeholder);

      search.addEventListener("input", function() {
        refresh_select(select, settings);
      });

      wrapper.appendChild(search);
      wrapper.search = search;  // kw: ? watch out for this...
    }

    // Add columns for selected and non-selected
    var non_selected = document.createElement("div");
    non_selected.className = "non-selected-wrapper";

    var selected = document.createElement("div");
    selected.className = "selected-wrapper";

    // Add click handler to toggle the selected status
    wrapper.addEventListener("click", function(event) {
      if (event.target.getAttribute("multi-index")) {  // kw: only activated when we click on a "row" element defined in refresh_select
        toggle_option(select, event, settings);
      }
    });

    // Add keyboard handler to toggle the selected status
    wrapper.addEventListener("keypress", function(event) {
      var is_action_key = event.keyCode === 32 || event.keyCode === 13;
      var is_option = event.target.getAttribute("multi-index");

      if (is_option && is_action_key) {
        // Prevent the default action to stop scrolling when space is pressed
        event.preventDefault();
        toggle_option(select, event, settings);
      }
    });

    wrapper.appendChild(non_selected);
    wrapper.appendChild(selected);

    wrapper.non_selected = non_selected;
    wrapper.selected = selected;

    select.wrapper = wrapper;

    // Add multi.js wrapper after select element
    select.parentNode.insertBefore(wrapper, select.nextSibling);

    // Save current state
    for (var i = 0; i < select.options.length; i++) {
      var option = select.options[i];
      option.setAttribute("data-origin-disabled", option.disabled); // kw: disabled is one of the attribute
    }

    // Check limit on initialization
    check_limit(select, settings);

    // Initialize selector with values from select element
    refresh_select(select, settings);

    // Refresh selector when select values change
    select.addEventListener("change", function() {  // kw: the change event is dispatched ealier...
      refresh_select(select, settings);
    });
  };

  return init;
})();

// Add jQuery wrapper if jQuery is present
if (typeof jQuery !== "undefined") {
  (function($) {
    $.fn.multi = function(settings) {
      settings = typeof settings !== "undefined" ? settings : {};

      return this.each(function() {
        var $select = $(this);

        multi($select.get(0), settings);
      });
    };
  })(jQuery);
}
