// Copyright (c) WATANABE Takuma <takumaw@sfo.kuramae.ne.jp>

'use strict';

var app = app || {};
app.popup = app.popup || {};

/*
 * initialize
 */

app.popup.initialize = function () {
	// initialize bookmark fields,
	// enable title input assistance
	// and initialize label completion
	app.popup.init_fields();

	// localize
	app.popup.localize();
};

app.popup.localize = function () {
	// TODO: Implement
}

app.popup.init_fields = function () {
	chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
  	var tab = tabs[0];

		// set title and url field
		$("#input-text-title")[0].value = tab.title;
		$("#input-text-url")[0].value = tab.url;

		// load label list and secret keys from google
		app.common.check_bookmark_query(tab.url,
			{},
			function(data, textStatus, jqXHR) {
				// when successfully loaded
				var html = $(data);

				// initialize sig field
				var sig = html.find("input[name=sig]")[0].value;
				$("#input-text-sig")[0].value = sig;

				// check whether this page is already bookmarked
				var add_or_edit = html.find("#search h1")[0].textContent;

				if (add_or_edit.indexOf("Add") >= 0) {
					// new to my bookmarks
					$("#col-bookmark-status-banner").addClass("notbookmarked");
					$("#col-bookmark-status-banner-message")[0].textContent = "Not bookmarked";

					// change icon
					$("#col-bookmark-status-banner-icon").empty();
					$("#col-bookmark-status-banner-icon")
						.append('<span class="glyphicon glyphicon-plus" aria-hidden="true"></span>')
						.on("click", app.popup.add_bookmark);
					$("#col-bookmark-status-banner-border").addClass("icon-is-on-display");
				} else {
					// already bookmarked
					$("#col-bookmark-status-banner").addClass("bookmarked");
					$("#col-bookmark-status-banner-message")[0].textContent = "Bookmarked";

					// change icon
					$("#col-bookmark-status-banner-icon").empty();
					$("#col-bookmark-status-banner-icon")
						.append('<span class="glyphicon glyphicon-trash" aria-hidden="true"></span>')
						.on("click", app.popup.delete_bookmark);
					$("#col-bookmark-status-banner-border").addClass("icon-is-on-display");

					// load title added to current page
					var current_title = html.find("input[name=title]")[0].value;
					$("#input-text-title")[0].value = current_title;

					// load note added to current page
					var current_note = html.find("textarea[name=annotation]")[0].value;
					$("#input-text-note")[0].value = current_note;

					// load labels added to current page
		            var current_labels_raw = html.find("input[name=labels]")[0].value;
		            var current_labels = [];
		            $.each(current_labels_raw.split(","), function(idx, val) {
		                if (val) {
		                    current_labels.push(val.trim());
		                }
		            });

					$("#input-text-labels")[0].value = current_labels.join(", ");
					if (current_labels.length > 0) {
						$("#input-text-labels")[0].value += ", ";
					}
				}

				// enable title input assistance
				app.popup.title_completion.init();

				// enable url input assistance
				app.popup.url_completion.init();

				// initialize label list for completion
				var labels = [];
				var label_elements = html.find('#sidenav > div > ul > li:not(".blue") > a').slice(0, -2);
				$.each(label_elements, function(idx, elm) {
					var label = elm.textContent.replace(/ \([0-9]+\)$/, '');
					labels.push(label.trim());
				});

				app.popup.label_completion.label_list = labels;

				// enable label input assistance
				app.popup.label_completion.init();

				// focus on label input
				$("#input-text-labels").focus();
			},
			function(jqXHR, textStatus, errorThrown) {
				// failed loading data from google;
				$("#col-bookmark-status-banner").addClass("error");
				$("#col-bookmark-status-banner-message")[0].textContent = "ERROR OCCURED";

				$("#col-bookmark-status-banner-icon").empty();
				$("#col-bookmark-status-banner-icon")
					.append('<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>')
					.on("click", app.popup.open_google_bookmark_webpage);
				$("#col-bookmark-status-banner-border").addClass("icon-is-on-display");
			}
		);
	});
}

/*
 * manipulate bookmark
 */

app.popup.open_google_bookmark_webpage = function () {
	chrome.tabs.create({"url": app.common.GOOGLE_BOOKMARK_ACTION_URL});
}

app.popup.add_bookmark = function () {
	// change icon
	$("#col-bookmark-status-banner-icon").empty();
	$("#col-bookmark-status-banner-icon")
		.append('<span class="glyphicon glyphicon-refresh rotating" aria-hidden="true"></span>');

	app.popup.add_bookmark_query(function() {
		$("#col-bookmark-status-banner").removeClass("bookmarked");
		$("#col-bookmark-status-banner").removeClass("notbookmarked");
		$("#col-bookmark-status-banner").removeClass("error");
		$("#col-bookmark-status-banner").addClass("done");

		$("#col-bookmark-status-banner-icon").empty();
		$("#col-bookmark-status-banner-icon")
			.append('<span class="glyphicon glyphicon-ok" aria-hidden="true"></span>');
		window.close();
	});
}

app.popup.delete_bookmark = function () {
	// change icon
	$("#col-bookmark-status-banner-icon").empty();
	$("#col-bookmark-status-banner-icon")
		.append('<span class="glyphicon glyphicon-refresh rotating" aria-hidden="true"></span>');

	app.popup.add_bookmark_query(function(data, textStatus, jqXHR) {
		$.ajax({
			url: app.common.GOOGLE_BOOKMARK_ACTION_URL_EN,
			data: {
				dlq: data,
				sig: $("#input-text-sig")[0].value,
				t: Number(new Date()),
			},
		}).done(function(data, textStatus, jqXHR) {
			$("#col-bookmark-status-banner").removeClass("bookmarked");
			$("#col-bookmark-status-banner").removeClass("notbookmarked");
			$("#col-bookmark-status-banner").removeClass("error");
			$("#col-bookmark-status-banner").addClass("done");

			$("#col-bookmark-status-banner-icon").empty();
			$("#col-bookmark-status-banner-icon")
				.append('<span class="glyphicon glyphicon-ok" aria-hidden="true"></span>');
			window.close();
		}).fail(function(jqXHR, textStatus, errorThrown) {
			// TODO: fix it
			// failed loading data from google;
			// throw error
			console.log(errorThrown);
			console.log(textStatus);
			console.log(jqXHR);
		});
	});
}

app.popup.add_bookmark_query = function(success, fail) {
	var title = $("#input-text-title")[0].value;
	var bkmk = $("#input-text-url")[0].value;
	var labels = $("#input-text-labels")[0].value;
	var annotation = $("#input-text-note")[0].value;
	var sig = $("#input-text-sig")[0].value;

	app.common.add_bookmark_query(title, bkmk, labels, annotation, sig, {}, success, fail);
}

/*
 * title input assistance
 */

app.popup.title_completion = {};

app.popup.title_completion.init = function () {
	$("#input-text-title").keydown(function(event) {
		switch (event.which) {
			case KeyEvent.DOM_VK_ENTER:
			case KeyEvent.DOM_VK_RETURN:
				app.popup.title_completion.enter();
				break;
			default:
				break;
		}
	});
};

app.popup.title_completion.enter = function () {
	$("#input-text-labels").focus();
};

/*
 * url input assistance
 */
app.popup.url_completion = {};

app.popup.url_completion.init = function () {
	$("#input-text-url").keydown(function(event) {
		switch (event.which) {
			case KeyEvent.DOM_VK_ENTER:
			case KeyEvent.DOM_VK_RETURN:
				app.popup.url_completion.enter();
				break;
			default:
				break;
		}
	});
};

app.popup.url_completion.enter = function () {
	$("#input-text-labels").focus();
};

/*
 * label input assistance
 */
app.popup.label_completion = {};

app.popup.label_completion.label_list = [];

app.popup.label_completion.init = function () {
	$("#input-text-labels").keydown(function(event) {
		switch (event.which) {
			case KeyEvent.DOM_VK_UP:
				app.popup.label_completion.change_highlighted_item("back");
				break;
			case KeyEvent.DOM_VK_DOWN:
				app.popup.label_completion.change_highlighted_item("next");
				break;
			case KeyEvent.DOM_VK_ENTER:
			case KeyEvent.DOM_VK_RETURN:
				app.popup.label_completion.enter_on_completion_item();
				break;
			default:
				break;
		}
	});

	$("#input-text-labels").on("input", function(event) {
		app.popup.label_completion.refresh_completion_list();
	});

	app.popup.label_completion.init_completion_list();
};

app.popup.label_completion.get_input_labels = function () {
	var labels = [];
	var labels_raw = $("#input-text-labels")[0].value.split(",");
	for (var idx in labels_raw) {
		var label = {};
		label.value_raw = labels_raw[idx];
		label.value = labels_raw[idx].trim();
		labels.push(label);
	}
	return labels;
}

app.popup.label_completion.init_completion_list = function () {
	var labels = app.popup.label_completion.label_list;
	var label_list_src = "";
	for (var idx in labels) {
		label_list_src += '<div class="label-completion-list-item hidden">' + labels[idx] + '</div>';
	}
	$("#label-completion-list").empty();
	$("#label-completion-list").append(label_list_src);

	$("#label-completion-list .label-completion-list-item").on("mouseenter", app.popup.label_completion.mouseenter_on_completion_item);
	$("#label-completion-list .label-completion-list-item").on("click", app.popup.label_completion.click_on_completion_item);
}

app.popup.label_completion.refresh_completion_list = function () {
	var labels = app.popup.label_completion.get_input_labels();
	var current_label = labels[labels.length-1];

	var is_first_match = true;
	$("#label-completion-list .label-completion-list-item").each(
		function(idx, elm) {
			if (current_label.value !== "" &&
					elm.textContent.match(current_label.value)/* &&
					elm.textContent !== current_label.value*/) {
				if (is_first_match) {
					$(elm).addClass("selected");
					is_first_match = false;
				} else {
					$(elm).removeClass("selected");
				}
				$(elm).removeClass("hidden");
			} else {
				$(elm).addClass("hidden");
				$(elm).removeClass("selected");
			}
		});
};

app.popup.label_completion.change_highlighted_item = function (order) {
	// choose
	var labels_choice = $("#label-completion-list .label-completion-list-item:not(.hidden)");
	var label_current_selection = $("#label-completion-list .label-completion-list-item.selected")[0];
	var label_current_selection_index = labels_choice.index(label_current_selection);

	var label_new_selection_index = label_current_selection_index;
	if (order === "next") {
		label_new_selection_index += 1;
	} else {
		label_new_selection_index -= 1;
	}
	label_new_selection_index = (labels_choice.length + label_new_selection_index) % labels_choice.length;

	$(labels_choice[label_current_selection_index]).removeClass("selected");
	$(labels_choice[label_new_selection_index]).addClass("selected");

	// scroll
	/*var itemTopPosition = $(labels_choice[label_new_selection_index]).position().top;
	var itemBottomPosition = $(labels_choice[label_new_selection_index]).position().top +
							 $(labels_choice[label_new_selection_index]).outerHeight(true);
	var scrollTopPosition = $("#label-completion-list").position().top + $("#label-completion-list").scrollTop();
	var scrollBottomPosition = $("#label-completion-list").position().top + $("#label-completion-list").scrollTop() +
							$("#label-completion-list").innerHeight();

	var scroll_position = $("#label-completion-list").scrollTop();
	if (itemBottomPosition > scrollBottomPosition) {
		scroll_position += itemBottomPosition - scrollBottomPosition;
	} else if (itemTopPosition < scrollTopPosition) {
		scroll_position += itemTopPosition - scrollTopPosition;
	}

	if (scroll_position != $("#label-completion-list").scrollTop()) {
		//$("#label-completion-list").animate({scrollTop: scroll_position, duration: 50});
		$("#label-completion-list").scrollTop(scroll_position);
	}*/
};

app.popup.label_completion.mouseenter_on_completion_item = function (event) {
	$("#label-completion-list .label-completion-list-item.selected").removeClass("selected");
	$(event.target).addClass("selected");
}

app.popup.label_completion.click_on_completion_item = function (event) {
	app.popup.label_completion.enter_on_completion_item();
	$("#input-text-labels").focus();
}

app.popup.label_completion.enter_on_completion_item = function () {
	var completion_selection = $("#label-completion-list .label-completion-list-item.selected");
	if (completion_selection.length !== 0) {
		var labels_current = app.popup.label_completion.get_input_labels().slice(0, -1);
		var labels = [];
		for (var idx in labels_current) {
			labels.push(labels_current[idx].value_raw);
		}
		var labels_str = labels.join(",");

		labels_str += labels_str !== "" ? ", " : "";
		labels_str += completion_selection[0].textContent + ", ";

		var label_input_box = $("#input-text-labels")[0];
		label_input_box.value = labels_str;

		app.popup.label_completion.refresh_completion_list();
	} else {
		app.popup.add_bookmark();
	}
}

/*
 * on load triggering
 */

$(document).ready(function(){
	app.popup.initialize();
});
