define(["./bar"], function(bar) {
    require(["./foo"], function() {
        return function (n) {
            return bar(n) * foo(n);
        };
    });
});
