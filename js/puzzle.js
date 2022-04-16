$(function () {
    function generateProblem(n) {
        var t = [];
        for (let i = 0; i < n; i++) {
            var r = [];
            for (let j = 0; j < n; j++) {
                r.push(Math.round(Math.random()));
            }
            t.push(r);
        }
        return t;
    }

    function renderTable(n) {
        var table = $("#table");
        table.empty();
        var elements = {
            hints: {
                row: new Array(n),
                col: new Array(n)
            },
            blocks: new Array(n)
        };
        {
            var row = $("<tr>");
            row.append($("<td>").addClass("ltblank"));
            for (let i = 0; i < n; i++) {
                var el = $("<td>").addClass("hint top-hint").append(
                    $("<div>").addClass("hint-box").data("col", i)
                );
                elements.hints.col[i] = el;
                row.append(el);
            }
            table.append(row);
        }
        for (let i = 0; i < n; i++) {
            var row = $("<tr>");
            var el = $("<td>").addClass("hint left-hint").append(
                $("<div>").addClass("hint-box").data("row", i)
            );
            elements.hints.row[i] = el;
            row.append(el);
            elements.blocks[i] = new Array(n);
            for (let j = 0; j < n; j++) {
                var el = $("<td>").data("row", i).addClass("block").data("col", j);
                elements.blocks[i][j] = el;
                row.append(el);
            }
            table.append(row);
        }
        return elements;
    }

    class Selector {
        constructor(gm) {
            this.gm = gm;
            this.listener = {}
            this.currentTarget = null;
            this.mousedown = false;
            this.fnType = -1; // 1 for add block, 2 for add X
            $("#table").on("mousedown", (e) => {
                if ($(e.target).hasClass("block")) {
                    this.mousedown = true;
                    this.currentTarget = $(e.target);
                    if (e.which == 1) {
                        this.fnType = 1;
                    } else if (e.which == 3) {
                        this.fnType = 2;
                    } else {
                        this.fnType = -1;
                    }
                    this.toggle(this.currentTarget);
                    return false;
                }
            }).on("mousemove", (e) => {
                if (this.mousedown) {
                    if (!this.currentTarget || !this.currentTarget.is(e.target)) {
                        this.currentTarget = $(e.target);
                        this.toggle(this.currentTarget);
                    }
                }
            }).on("contextmenu", (e) => {
                return false;
            });
            $(window).mouseup(() => {
                this.mousedown = false;
                this.currentTarget = null;
            });
        }

        on(event, fn) {
            if (!this.listener.hasOwnProperty(event)) {
                this.listener[event] = [];
            }
            this.listener[event].push(fn);
        }

        emit(event, ...args) {
            if (this.listener.hasOwnProperty(event)) {
                for (let fn of this.listener[event]) {
                    fn.apply(this.gm, args);
                }
            }
        }

        toggle(el) {
            if (el.hasClass("block")) {
                var r = el.data("row");
                var c = el.data("col");
                var state = this.gm.currentState[r][c];
                if (this.fnType == 1) {
                    this.gm.currentState[r][c] = (state == 0) ? 1 : 0;
                    if (state == 1) {
                        el.removeClass("selected");
                    } else {
                        el.removeClass("crossed").addClass("selected");
                    }
                } else if (this.fnType == 2) {
                    this.gm.currentState[r][c] = (state == 0) ? 2 : 0;
                    if (state == 2) {
                        el.removeClass("crossed");
                    } else {
                        el.removeClass("selected").addClass("crossed");
                    }
                }
                this.emit("change", r, c);
            }
        }
    }

    class GameManager {
        constructor() {
            this.n = -1;
            this.points = [];
            this.answer = [];
            this.eles = {};
            this.hints = { row: [], col: [] };
            this.currentState = [];
            this.selector = new Selector(this);
            this.selector.on("change", this.onBlockStateChange);
            this.initListener();
        }

        initListener() {
            $(".start-btn").on("click", (e) => {
                var n = Number($(e.target).attr("data-size"));
                this.startGame(n, null);
            });
            $("#btn-reset").on("click", (e) => {
                this.resetGame();
            });
            $("#btn-newGame").on("click", (e) => {
                this.startGame(this.n);
            });
            $("#btn-back").on("click", (e) => {
                this.backToMain();
            });
        }

        updateProgress() {
            var total = this.points.reduce((a, b) => a + b);
            var p = 100 * total / (this.n * 2);
            var text = Math.ceil(p) + "%";
            $("#progress-text").text(text);
            $("#progress-bar").css({ width: text });
            return total;
        }

        bingo() {
            swal({
                title: "Great Job",
                text: "Wow~ You finished this puzzle! 👏👏",
                icon: "success",
                buttons: ["Back to main", "Play again"]
            }).then((value) => {
                if (value) {
                    this.startGame(this.n);
                } else {
                    this.backToMain();
                }
            });
        }

        check(hint, eles, getState) {
            var part = [];
            var cnt = 0;
            var empty = true;
            for (let i = 0; i < this.n; i++) {
                if (getState(i) == 1) {
                    cnt++;
                    empty = false;
                } else if (cnt) {
                    part.push(cnt);
                    cnt = 0;
                }
            }
            if (cnt) {
                part.push(cnt);
                cnt = 0;
            }
            if (empty) {
                part.push(0);
            }
            var i;
            for (i = 0; i < hint.length; i++) {
                if (i >= part.length || part[i] != hint[i]) {
                    break;
                }
                eles.find(".hint-box").children(".hint-num").eq(i).addClass("bingo");
            }
            if (i == hint.length) {
                eles.addClass("completed");
            } else {
                eles.removeClass("completed");
            }
            var point = i / hint.length;
            while (i < hint.length) {
                eles.find(".hint-box").children(".hint-num").eq(i).removeClass("bingo");
                i++;
            }
            return point;
        }

        onBlockStateChange(row, col) {
            var rowP = this.check(this.hints.row[row], this.eles.hints.row[row],
                (i) => this.currentState[row][i]);
            this.points[row] = rowP;
            this.points[this.n + col] = this.check(this.hints.col[col], this.eles.hints.col[col],
                (i) => this.currentState[i][col]);
            var total = this.updateProgress();
            if (total == this.n * 2) {
                this.bingo();
            }
        }

        renderHint(hint, el, getAns) {
            var box = el.find(".hint-box");
            var cnt = 0;
            var empty = true;
            for (let i = 0; i < this.n; i++) {
                if (getAns(i)) {
                    cnt++;
                    empty = false;
                } else if (cnt) {
                    hint.push(cnt);
                    box.append($("<span>").addClass("hint-num").text(cnt));
                    cnt = 0;
                }
            }
            if (cnt) {
                hint.push(cnt);
                box.append($("<span>").addClass("hint-num").text(cnt));
                cnt = 0;
            }
            if (empty) {
                hint.push(0);
                box.append($("<span>").addClass("hint-num bingo").text("0"));
                el.addClass("completed");
            }
            return empty ? 1 : 0;
        }

        renderHints() {
            this.hints.row = new Array(this.n);
            this.hints.col = new Array(this.n);
            for (let i = 0; i < this.n; i++) {
                this.hints.row[i] = [];
                this.hints.col[i] = [];
            }
            for (let i = 0; i < this.n; i++) {
                this.points[i] += this.renderHint(this.hints.row[i], this.eles.hints.row[i],
                    (x) => this.answer[i][x]);
                this.points[this.n + i] += this.renderHint(this.hints.col[i], this.eles.hints.col[i],
                    (x) => this.answer[x][i]);
            }
        }

        startGame(n, answer) {
            this.n = n;
            this.points = new Array(2 * n).fill(0);
            this.answer = answer ? answer : generateProblem(n);
            this.eles = renderTable(n);
            this.currentState = new Array(n);
            for (let i = 0; i < n; i++) {
                this.currentState[i] = new Array(n).fill(0);
            }
            this.renderHints();
            $("#content").addClass("playing");
            this.updateProgress();
        }

        resetGame() {
            this.currentState = new Array(this.n);
            for (let i = 0; i < this.n; i++) {
                this.currentState[i] = new Array(this.n).fill(0);
            }
            this.eles.blocks.forEach((val) => {
                val.forEach((el) => {
                    el.removeClass("selected crossed");
                });
            });
            for (let i = 0; i < this.n; i++) {
                this.onBlockStateChange(i, i);
            }
        }

        backToMain() {
            $("#table").empty();
            $("#content").removeClass("playing");
        }
    };

    var gameManager = new GameManager();
    window.gm = gameManager;
});