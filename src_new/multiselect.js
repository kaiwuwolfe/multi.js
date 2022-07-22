/**
 * multiselect.js
 * A user-friendly replacement for select boxes with option groups and multiple selections enabled.
 *
 * Author: Fabian Lindfors, Kai Wu
 * License: MIT
 */

// TODO: headers

let multiselect = (function () {
    let disabled_limit = false; // This will prevent to reset the "disabled" because of the limit at every click
    let selected_opts = new Set();
    let opt_index = {};

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
            let selected_count = selected_opts.size;

            // Reached the limit
            if (selected_count === limit) {
                disabled_limit = true

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
            } else if (disabled_limit) {
                // Enable options (only if they weren't disabled on init)
                for (let i = 0; i < select.options.length; i++) {
                    let opt = select.options[i];

                    if (opt.getAttribute("data-origin-disabled") === "false") {
                        opt.removeAttribute("disabled");    // we can only remove disabled attribute rather than uncheck it
                    }
                }

                disabled_limit = false;
            }
        }
    };

    // Toggles the option group
    let toggle_option_group = function (select, event, settings) {
        let optGroups = select.getElementsByTagName('optgroup');
        let optGroup = optGroups[event.target.getAttribute("layer1-index")];

        // ignore the clicks (not clickable) if the option group is disabled initially, or is already selected
        if (optGroup.disabled || optGroup.selected) {
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
        let option = select.options[event.target.getAttribute("layer2-index")];

        if (option.disabled) {
            return;
        }

        let data = option.value || option.textContent || option.innerText;
        let yes = null;
        for (let i of opt_index[data]) {
            yes = select.options[i].selected;
            select.options[i].selected = !yes;
        }

        if (!yes) {
            selected_opts.add(data);
        } else {
            selected_opts.delete(data);
        }

        check_limit(select, settings);

        trigger_event("opt_change", select);
    };


    // called once
    let build_opt_index = function (select) {

        let optGroups = select.getElementsByTagName('optgroup');
        let j = 0;
        for (let optG of optGroups) {
            for (let opt of optG.children) {
                let data = opt.value || option.textContent || option.innerText;
                if (opt_index.hasOwnProperty(data)) {
                    opt_index[data].push(j);
                } else {
                    opt_index[data] = [j];
                }
                j += 1;
            }
        }
    };

    // Refreshes opt group layer
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
            // do not render empty groups if "hide_empty_groups" is true
            if (settings.hide_empty_groups && optgrp.childElementCount === 0) {
                continue;
            }
            let label = optgrp.label;
            let row = document.createElement("a");
            row.className = "item";
            row.innerText = label;
            if (query) {
                row.className += " frozen";
            } else {
                row.setAttribute("role", "button");
                row.setAttribute("data-value", label);  // TODO: check the purpose of using "data-value"
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
        for (let optG of optGroups) {
            if (optG.disabled || (!query && !optG.selected)) {
                j += optG.childElementCount;
                continue;
            }
            for (let option of optG.children) {
                let value = option.value;
                let label = option.textContent || option.innerText;
                let data = value || label

                let row = document.createElement("a");
                row.className = "item";
                row.innerText = label;
                row.setAttribute("role", "button");
                row.setAttribute("data-value", data);
                row.setAttribute("layer2-index", j);
                j += 1;

                if (option.disabled) {
                    row.className += " disabled";
                }

                if (option.selected || selected_opts.has(data)) {
                    row.className += " selected";
                }

                if (settings.show_tooltip && option.hasAttribute("data-descr")) {
                    let descr = document.createElement("span");
                    descr.innerText = option.getAttribute("data-descr");
                    descr.className = "opt-data-descr";
                    row.appendChild(descr);
                }

                // Apply search filtering
                if (!query || (query && data.toLowerCase().indexOf(query.toLowerCase()) > -1)) {
                    select.wrapper.layer2.appendChild(row);
                }
            }
        }
    };

    let refresh_selected = function (select, settings) {
        select.wrapper.selected_box.innerHTML = '';
        select.wrapper.restart_button.style.display = "none";
        if (!selected_opts.size) {
            return;
        }
        for (let data of selected_opts) {
            let box = document.createElement("span");
            box.innerText = data;
            box.classList.add("opt-box");
            let cross = document.createElement("span");
            cross.innerText = '🗙';
            cross.classList.add("opt-box-del");
            cross["onclick"] = (ev) => {
                for (let i of opt_index[data]) {
                    select.options[i].selected = false;
                }
                selected_opts.delete(data);
                check_limit(select, settings);
                trigger_event("opt_change", select);
            }
            box.appendChild(cross);
            select.wrapper.selected_box.appendChild(box);
        }
        select.wrapper.restart_button.style.display = "inline-block";
    };

    let refresh_counter = function (select, settings) {
        document.querySelectorAll('.optgrp-counter').forEach(c => c.remove());

        let optGroups = select.getElementsByTagName('optgroup');
        for (let optgrp of optGroups) {
            let optgrp_counter = document.createElement('span');
            optgrp_counter.innerText = '' + Array.from(optgrp.children).reduce((sum, opt) => sum + opt.selected, 0);
            optgrp_counter.className = "optgrp-counter";
            optgrp_counter.style.display = optgrp_counter.innerText > 0 ? 'inline-block' : 'none';
            optgrp.row.appendChild(optgrp_counter);
        }
    };

    // Intializes and constructs an multiselect.js instance
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
        settings["show_tooltip"] =
            typeof settings["show_tooltip"] !== "undefined"
                ? parseInt(settings["show_tooltip"])
                : true;
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
            Array.from(select.options).map((opt) => opt.selected = false);
            selected_opts.clear();
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
            option.setAttribute("data-origin-disabled", option.disabled);
        }

        // Check limit on initialization
        check_limit(select, settings);

        // Initialize selector with values from select element

        // initialize opt_index
        build_opt_index(select);

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
