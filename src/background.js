// Copyright (c) WATANABE Takuma <takumaw@sfo.kuramae.ne.jp>

'use strict';

var app = app || {};
app.background = app.background || {};

/*
 * initialize
 */

app.background.initialize = function () {
	// add omnibox handler
	chrome.omnibox.onInputEntered.addListener(
		app.background.omnibox_handler
	);
};

/*
 * omnibox handler
 */

app.background.omnibox_handler = function(text) {
    var url = "https://www.google.com/bookmarks/find?";
		url += $.param({
			q: text,
		});
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        chrome.tabs.update(tabs[0].id, {url: url});
    });
};

/*
 * on load triggering
 */

$(document).ready(function(){
	app.background.initialize();
})
