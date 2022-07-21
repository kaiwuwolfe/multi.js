/**
 * multiselect.js
 * A user-friendly replacement for select boxes with option groups and multiple selections enabled.
 *
 * Author: Fabian Lindfors, Kai Wu
 * License: MIT
 */

// TODO: handle duplicates
// TODO: add tick to the selected layer 2 items
// TODO: use toggle method
// TODO: hover show definition...

let multiselect = (function () {
        let disabled_limit = false; // This will prevent to reset the "disabled" because of the limit at every click

        // Helper function to trigger an event on an element
        let trigger_event = function (type, el) {
            let e = document.createEvent("HTMLEvents");
            e.initEvent(type, false, true);
            el.dispatchEvent(e);
        };

        // Check if there is a limit and if is reached
        let check_limit = function (select, settings) {
            let limit = settings.limit;
            if (limit > -1) {
                // Count current selected
                let selected_count = 0;
                for (let i = 0; i < select.options.length; i++) {
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
                    for (let i = 0; i < select.options.length; i++) {
                        let opt = select.options[i];

                        if (!opt.selected) {
                            opt.setAttribute("disabled", true);
                        }
                    }
                } else if (this.disabled_limit) {
                    // Enable options (only if they weren't disabled on init)
                    for (let i = 0; i < select.options.length; i++) {
                        let opt = select.options[i];

                        if (opt.getAttribute("data-origin-disabled") === "false") {
                            opt.removeAttribute("disabled");    // we can only remove disabled attribute rather than uncheck it
                        }
                    }

                    this.disabled_limit = false;
                }
            }
        };

        // Toggles the target option on the select
        let toggle_option_group = function (select, event, settings) {
            let optGroups = select.getElementsByTagName('optgroup');
            let optGroup = optGroups[event.target.getAttribute("layer1-index")];  // kw: use string for slicing...

            // ignore the clicks (not clickable) if the option group is disabled initially
            if (optGroup.disabled) {
                return;
            }

            let is_selected = optGroup.selected;
            if (is_selected) {
                return;
            }

            optGroup.selected = true;

            for (let optG of optGroups) {
                if (optG !== optGroup) {
                    optG.selected = false;
                }
            }

            trigger_event("opt_group_change", select);
        };

        let toggle_option = function (select, event, settings) {
            let option = select.options[event.target.getAttribute("layer2-index")];  // kw: use string for slicing...

            if (option.disabled) {
                return;   // if option.disabled: this row is not selectable...
            }

            option.selected = !option.selected;  // kw: false to true, true to false...

            check_limit(select, settings);  // TODO

            trigger_event("opt_change", select);
        };

        // Refreshes an already constructed multi.js instance
        let refresh_layer1 = function (select, settings) {
            // Clear column
            select.wrapper.layer1.innerHTML = "";

            // Add headers to columns
            if (settings.layer1_header) {
                let layer1_header = document.createElement("div");
                layer1_header.className = "header";

                layer1_header.innerText = settings.layer1_header;
                select.wrapper.layer1.appendChild(layer1_header);
            }

            let query = null;
            if (select.wrapper.search) {
                query = select.wrapper.search.value;
            }

            // Loop over option groups and add to the layer 1 column
            let optGroups = select.getElementsByTagName('optgroup');
            for (let i = 0; i < optGroups.length; i++) {
                let optgrp = optGroups[i];
                // skip empty groups if
                if (settings.hide_empty_groups && optgrp.childElementCount === 0) {
                    continue;
                }
                let label = optgrp.label;
                let row = document.createElement("a");
                // row.tabIndex = 0;
                row.className = "item";
                row.innerText = label;
                if (query) {
                    row.className += " frozen";
                } else {
                    row.setAttribute("role", "button");
                    row.setAttribute("data-value", label);  // TODO: check
                    row.setAttribute("layer1-index", i);

                    if (optgrp.selected) {
                        row.className += " selected";
                    }

                    if (optgrp.disabled) {
                        row.className += " disabled";
                    }
                }
                optgrp.row = row;
                select.wrapper.layer1.appendChild(row)
            }
            refresh_counter(select, settings);
        };

        let refresh_layer2 = function (select, settings) {
            // Clear column
            select.wrapper.layer2.innerHTML = "";

            if (settings.layer2_header) {
                let layer2_header = document.createElement("div");
                layer2_header.className = "header";
                layer2_header.innerText = settings.layer2_header;
                select.wrapper.layer2.appendChild(layer2_header);
            }

            let query = null;
            if (select.wrapper.search) {
                query = select.wrapper.search.value;
            }

            let optGroups = select.getElementsByTagName('optgroup');
            let j = 0;
            for (let i = 0; i < optGroups.length; i++) {
                let optGroup = optGroups[i];
                if (optGroup.disabled || (!query && !optGroup.selected)) { // TODO: need to handle conflicts with search query
                    j += optGroup.childElementCount;
                    continue;
                }
                for (let option of optGroup.children) {
                    let value = option.value;
                    let label = option.textContent || option.innerText;
                    // kw: ? what's the difference between textContent, innerText, text, and value...

                    let row = document.createElement("a");
                    // row.tabIndex = 0;  // kw: make it tabbable
                    row.className = "item";
                    row.innerText = label;
                    row.setAttribute("role", "button");
                    row.setAttribute("data-value", value);
                    row.setAttribute("layer2-index", j);
                    j += 1;

                    if (option.disabled) {
                        row.className += " disabled";  // kw: cool
                    }

                    if (option.selected) {
                        row.className += " selected";
                    }

                    // Apply search filtering
                    if (!query || (query && label.toLowerCase().indexOf(query.toLowerCase()) > -1)) {
                        select.wrapper.layer2.appendChild(row);
                    }
                }

            }
        };

        let refresh_selected = function (select, settings) {
            select.wrapper.selected_box.innerHTML = '';
            let has_element = false;
            for (let opt of select.options) {  // TODO: this might be a bit slow...
                if (opt.selected) {
                    let box = document.createElement("span");
                    box.innerText = opt.textContent || opt.innerText
                    box.classList.add("opt-box");
                    // box.opt = opt;
                    let cross = document.createElement("span");
                    cross.innerText = '🗙';
                    cross.classList.add("opt-box-del");
                    cross["onclick"] = (ev) => {
                        opt.selected = !opt.selected;
                        check_limit(select, settings);
                        trigger_event("opt_change", select);
                    }
                    box.appendChild(cross);
                    select.wrapper.selected_box.appendChild(box);
                    has_element = true;
                }
            }
            select.wrapper.restart_button.style.display = has_element? "inline-block": "none";
        };

        let refresh_counter = function (select, settings) {
            document.querySelectorAll('.optgrp-counter').forEach(c=>c.remove());

            let optGroups = select.getElementsByTagName('optgroup');
            for (let optgrp of optGroups) {
                let optgrp_counter = document.createElement('span');
                optgrp_counter.innerText = '' + Array.from(optgrp.children).reduce((sum, opt)=> sum + opt.selected, 0);
                optgrp_counter.className = "optgrp-counter";
                optgrp_counter.style.display = optgrp_counter.innerText > 0 ? 'inline-block' : 'none';
                optgrp.row.appendChild(optgrp_counter);
            }
        };

        // Intializes and constructs an multi.js instance
        let init = function (select, settings) {
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
            settings["layer1_header"] =
                typeof settings["layer1_header"] !== "undefined"
                    ? settings["layer1_header"]
                    : null;
            settings["layer2_header"] =
                typeof settings["layer2_header"] !== "undefined"
                    ? settings["layer2_header"]
                    : null;
            settings["limit"] =
                typeof settings["limit"] !== "undefined"
                    ? parseInt(settings["limit"])
                    : -1;
            settings["default_optgroup"] =
                typeof settings["default_optgroup"] !== "undefined"
                    ? parseInt(settings["default_optgroup"])
                    : 0;
            if (isNaN(settings["limit"])) {
                settings["limit"] = -1;
            }
            settings["hide_empty_groups"] =
                typeof settings["hide_empty_groups"] !== "undefined"
                    ? settings["hide_empty_groups"]
                    : true;   // hide empty groups by default

            // Check if already initialized
            if (select.dataset.multijs != null) {  // TODO: kw: ? when is multijs first set to true?
                return;
            }

            // Make sure element is select and there are optgroups and multiple is enabled
            if (select.nodeName !== "SELECT" || !select.multiple || !select.hasChildNodes('optgroup')) {  // kw: multiple is specified in the html file
                return;
            }

            // Hide select
            select.style.display = "none";
            select.setAttribute("data-multijs", true);  // TODO: what does "data-multijs" do here...

            // Start constructing selector
            let wrapper = document.createElement("div");
            wrapper.className = "multi-wrapper";

            // Add search bar
            if (settings.enable_search) {
                let search = document.createElement("input");
                search.className = "search-input";
                search.type = "search";
                search.setAttribute("placeholder", settings.search_placeholder);
                search.setAttribute("title", settings.search_placeholder);

                search.addEventListener("input", function () {
                    // refresh_select(select, settings);
                    refresh_layer1(select, settings);
                    refresh_layer2(select, settings);
                });

                wrapper.appendChild(search);
                wrapper.search = search;
            }

            // Add columns for layer 1 and layer 2
            let layer1 = document.createElement("div");  //kw: was non_selected
            layer1.className = "layer1-wrapper";   // kw: was non_selected non-selected-wrapper

            let layer2 = document.createElement("div");  //kw: was selected
            layer2.className = "layer2-wrapper";   // kw: was selected selected-wrapper

            let selected_box = document.createElement("div");
            selected_box.className = 'multi-selected-box';

            let restart_button = document.createElement("div");
            restart_button.className = 'multi-wrapper-restart';
            restart_button.innerHTML = "<span>↺</span>"
            restart_button.style.display = 'none';
            restart_button["onclick"] = (ev) => {
                Array.from(select.options).map((opt)=>opt.selected=false);
                check_limit(select, settings);
                trigger_event("opt_change", select);
            };

            // Add click handler to toggle the selected status
            wrapper.addEventListener("click", function (event) {
                if (event.target.getAttribute("layer1-index")) {
                    toggle_option_group(select, event, settings);
                }
            });

            // Add click handler to toggle the selected status
            wrapper.addEventListener("click", function (event) {
                if (event.target.getAttribute("layer2-index")) {
                    toggle_option(select, event, settings);
                }
            });

            wrapper.appendChild(layer1);
            wrapper.appendChild(layer2);

            wrapper.layer1 = layer1;
            wrapper.layer2 = layer2;
            wrapper.selected_box = selected_box;
            wrapper.restart_button = restart_button;
            select.wrapper = wrapper;

            // Add multi.js wrapper after select element
            select.parentNode.insertBefore(wrapper, select.nextSibling);
            wrapper.parentNode.insertBefore(restart_button, wrapper.nextSibling);
            wrapper.parentNode.insertBefore(selected_box, wrapper.nextSibling);

            // Save current state
            for (let i = 0; i < select.options.length; i++) {
                let option = select.options[i];
                option.setAttribute("data-origin-disabled", option.disabled); // kw: disabled is one of the attribute
            }

            // Check limit on initialization
            check_limit(select, settings);

            // Initialize selector with values from select element

            // settings

            // set the default_optgoup as "selected"
            let optGroups = select.getElementsByTagName('optgroup');
            let i = settings.default_optgroup;
            if (optGroups[i] !== undefined && !optGroups[i].disabled) {
                optGroups[i].selected = true;
            } else {  // find the first optgroup that is not disabled
                for (let optG of optGroups) {
                    if (!optG.disabled) {
                        optG.selected = true;
                        break;
                    }
                }
            }

            refresh_layer1(select, settings);
            refresh_layer2(select, settings);
            refresh_selected(select, settings);

            // Refresh selector when select values change
            select.addEventListener("opt_group_change", function () {
                refresh_layer1(select, settings);
                refresh_layer2(select, settings);
            });

            // Refresh selector when select values change
            select.addEventListener("opt_change", function () {
                refresh_layer2(select, settings);
                refresh_selected(select, settings);
                refresh_counter(select, settings);
            });
        };

        return init;
    })();

// Add jQuery wrapper if jQuery is present
if (typeof jQuery !== "undefined") {
    (function ($) {
        $.fn.multiselect = function (settings) {
            settings = typeof settings !== "undefined" ? settings : {};

            return this.each(function () {
                let $select = $(this);

                multiselect($select.get(0), settings);
            });
        };
    })(jQuery);
}
