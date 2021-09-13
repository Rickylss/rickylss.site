title = document.title

window.onblur = function() {
    title = document.title
    document.title = "快回来哦~~";
};

window.onfocus = function() {
    document.title = title;
}