// jshint esversion: 6
function fadecard(id, action) {
    // post to saved articles
    // show that it's been saved.
    $(`#${id}`).html(`article ${action}.`);
    // collapse and disappear after a second
    setTimeout(() => {
        $(`#${id}`)
            .animate({ height: 0, padding: 0, margin: 0, border: 0 }, 500, function () {
                // clear text as well
                $(this).html("");
                // delete it
                $(this).remove();
            });
    }, 1000);
}
