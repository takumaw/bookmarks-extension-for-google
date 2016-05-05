// Copyright (c) WATANABE Takuma <takumaw@sfo.kuramae.ne.jp>

'use strict';

var app = app || {};
app.options = app.options || {};


/*
 * initialize
 */

app.options.initialize = function () {
  // localization
  app.options.localize();

  // enable upload bookmarks button
  $("#upload_bookmarks_button_select_file").on("click", function() {
    app.options.upload_bookmark_to_google_button_handler();
  });

  $("#upload_bookmarks_input_select_file_hidden").on("change",
    app.options.upload_bookmark_to_google_input_handler);

  // enable test button
  $("#tests_button_test").on("click", function() {
    app.options.load_data_from_google();
  });
};

app.options.localize = function () {
  // TODO: Implement
}

/*
 * bulk upload bookmarks to google
 */

app.options.upload_bookmark_to_google_button_handler = function () {
  $("#upload_bookmarks_input_select_file_hidden")[0].value = "";
  $("#upload_bookmarks_input_select_file_hidden")[0].click();
}

app.options.upload_bookmark_to_google_input_handler = function (e) {
  var file = e.target.files[0];

  if ( file === undefined || file.name === "" ) {
      return;
  } else if ( file.type !== "text/html") {
      return;
  }

  var filename = file.name;

  var filereader = new FileReader();

  filereader.onload = function(e) {
    // read bookmark.html file
    var result = e.target.result;
    var bookmark_items = app.options.bookmark_html_parser(result);

		// generate root label
    var label_root = "Uploaded at " + new Date().toJSON().substring(0,10);

    // counter for showing progress
    var counter_bookmarks_added_succ = 0;
    var counter_bookmarks_added_fail = 0;
    var counter_bookmarks_added_skip = 0;

    // add bookmarks to Google Bookmark
    $(bookmark_items).each(function(idx, elm) {
      var title = elm.title;
      var bkmk = elm.url;
      var labels = [label_root];
      $(elm.path).each(function(i, v) {
        labels.push(v.replace(/,/g, "，").replace(/\//g, "／"));
      });
      labels = labels.join("/");
      var annotation = "";

      // check whether already bookmarked
      app.common.check_bookmark_query(
        bkmk,
        {
          async: false,
        },
        function(data, textStatus, jqXHR) {
          // successfully loaded data from google
          // retrieve sig
    			var html = $(data);
          var sig = html.find("input[name=sig]")[0].value;

    			// check whether this page is already bookmarked
    			var add_or_edit = html.find("#search h1")[0].textContent;
    			if (add_or_edit.indexOf("Add") >= 0) {
            // not bookmarked
            app.common.add_bookmark_query(title, bkmk, labels, annotation, sig,
              {
                async: false,
              },
              function() {
                // succeeded
                ++counter_bookmarks_added_succ;
              },
              function() {
                // failed
                ++counter_bookmarks_added_fail;
              }
            );
          } else {
            // already bookmarked
            // skip
            ++counter_bookmarks_added_skip;
          }
        },
        function(jqXHR, textStatus, errorThrown) {
          // failed check whether already bookmarked
          ++counter_bookmarks_added_fail;
        }
      );

      // show progress
      if ((counter_bookmarks_added_succ + counter_bookmarks_added_fail + counter_bookmarks_added_skip) % 10 === 0) {
        $("#upload_bookmarks_result")[0].innerHTML += "..." + (counter_bookmarks_added_succ + counter_bookmarks_added_fail + counter_bookmarks_added_skip);
        console.log(
          counter_bookmarks_added_succ + counter_bookmarks_added_fail + counter_bookmarks_added_skip,
          "out of",
          bookmark_items.length,
          "."
        );
      }
    });

    // show result message
    if (counter_bookmarks_added_fail === 0) {
      $("#upload_bookmarks_result")[0].innerHTML = '<span style="color: green;">SUCCEEDED</span>';
    } else {
      $("#upload_bookmarks_result")[0].innerHTML = '<span style="color: red;">FAILED</span>';
    }
    $("#upload_bookmarks_result")[0].innerHTML += "<br>";
    $("#upload_bookmarks_result")[0].innerHTML += counter_bookmarks_added_succ + ' added, ';
    $("#upload_bookmarks_result")[0].innerHTML += counter_bookmarks_added_skip + ' skipped, ';
    $("#upload_bookmarks_result")[0].innerHTML += counter_bookmarks_added_fail + ' failed.';
  };

  filereader.onerror = function (e) {
    // TODO: fix it
    console.log(e);

    // show result message
    $("#upload_bookmarks_result")[0].innerHTML = '<span style="color: red;">FAILED</span>';
  }

  filereader.readAsText(file);
}

app.options.bookmark_html_parser = function (source) {
  var dom = $(source);
  var dom_dl = undefined;
  for (var i = 0; i < dom.length; ++i) {
    if ($(dom[i]).is("dl")) {
      dom_dl = dom[i];
      break;
    }
  }

  if (dom_dl === undefined) {
    return;
  } else {
    return app.options.bookmark_html_parser_parsetree(dom_dl, []);
  }
}

app.options.bookmark_html_parser_parsetree = function (elm, current_path) {
  var bookmark_items = [];

  $(elm).children().each(
    function(idx, elm_child) {
      var elm_child_jq = $(elm_child);
      if (elm_child_jq.is("dt")) {
        if (elm_child_jq.has("h3").length > 0) {
          // folder
          var folder_name = elm_child_jq.children("h3").text().trim();
          var folders_path = current_path.concat([folder_name]);
          var bookmark_items_tmp = app.options.bookmark_html_parser_parsetree(elm_child_jq.children("dl")[0], folders_path);
          bookmark_items = bookmark_items.concat(bookmark_items_tmp);
        } else {
          // item
          var item_name = elm_child_jq.children("a").text().trim();
          var item_url = elm_child_jq.children("a").attr("href");

          var bookmark_item = {
            path: current_path,
            title: item_name,
            url: item_url
          };

          bookmark_items.push(bookmark_item);
        }
      }
    }
  );

  return bookmark_items;
}

/*
 * functionality test
 */

app.options.load_data_from_google = function () {
  $.ajax({
    url: app.common.GOOGLE_BOOKMARK_ACTION_URL_EN,
    data: {
      op: "edit",
    }
	}).done(function (data, textStatus, jqXHR) {
    var html = $(data);

    // get sig
    var sig = html.find("input[name=sig]")[0].value;
    $("#tests_field_sig")[0].value = sig;

    // get labels
    var labels = [];
    var label_elements = html.find('#sidenav > div > ul > li:not(".blue") > a').slice(0, -2);
    $.each(label_elements, function(idx, elm) {
      var label = elm.textContent.replace(/ \([0-9]+\)$/, '');
      labels.push(label.trim());
    });
    $("#tests_field_labels")[0].value = labels.join(", ");

    // show result message
    $("#tests_result")[0].innerHTML = '<span style="color: green;">SUCCEEDED</span>';
	}).fail(function(jqXHR, textStatus, errorThrown) {
		// TODO: fix it
		// failed loading data from google;
		// throw error
		console.log(errorThrown);
		console.log(textStatus);
		console.log(jqXHR);

    // show result message
    $("#tests_result")[0].innerHTML = '<span style="color: red;">FAILED; May be you are logged out of Google?</span>';
	});
}

/*
 * on load triggering
 */

$(document).ready(function(){
	app.options.initialize();
})
