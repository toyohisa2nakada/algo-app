class State {
    constructor(game, s, expand = false) {
        this.game = game;
        this.s = s;
        this.sa = null;
        this.na = {};
        this.qa = {};
        this.css_index = -1;
        if (expand) {
            this.expand(0, 0, -1);
        }
    }

    set_css_index(index) {
        this.css_index = index;
    }

    is_leaf(css_index) {
        return !(css_index in this.na);
    }

    is_finished() {
        // console.log(this)
        return !this.s.cells.includes(0) || this.game.judge(this.s) !== 0;
    }

    select(css_index = -1) {
        const naArr = this.na[css_index];
        const qaArr = this.qa[css_index];
        const ns = naArr.reduce((a, b) => a + b, 0);

        const cost = (ns, n) => Math.sqrt(2 * Math.log(ns)) / n;

        const scores = naArr.map((n, i) =>
            qaArr[i] * this.s["p0_q"] + mtcs.cp * cost(ns, n)
        );
        const i = scores.indexOf(Math.max(...scores));

        const ai = this.sa[i];
        this.na[css_index][i] = Math.floor(this.na[css_index][i] + 1) + Math.random();

        const s2 = this.game.move(this.s, ai);
        const cs2 = mtcs.find(s2);

        if (cs2.is_leaf(this.css_index)) {
            if (!cs2.is_finished() && this.na[css_index][i] >= mtcs.exp_limit) {
                cs2.expand(this.na[css_index][i], this.qa[css_index][i], this.css_index);
            } else {
                const n = this.na[css_index][i];
                this.qa[css_index][i] = (this.qa[css_index][i] * (n - 1) + cs2.evaluate()) / n;
            }
        } else {
            const [newN, newQ] = cs2.select(this.css_index);
            this.na[css_index][i] = newN;
            this.qa[css_index][i] = newQ;
        }

        const totalN = naArr.reduce((a, b) => a + b, 0);
        const totalW = naArr.reduce((sum, n, i) => sum + n * qaArr[i], 0);
        const avgQ = totalW / totalN;
        return [totalN, avgQ];
    }

    expand(n, q, css_index) {
        const sa_candidate = this.game.actions(this.s);
        const sa_candidate_s = [];

        const already_in = (s) =>
            sa_candidate_s.some((si) => this.game.compare(s, si));

        this.sa = [];
        for (const sa_i of sa_candidate) {
            const s2 = this.game.move(this.s, sa_i);
            if (!already_in(s2)) {
                sa_candidate_s.push(s2);
                this.sa.push(sa_i);
            }
        }

        const ns = this.sa.length;
        const na = Array.from({ length: ns }, () => Math.random());
        const rtotal = na.reduce((a, b) => a + b, 0);
        n = Math.max(1.01, n);

        this.na[css_index] = na.map((x) => (n * x) / rtotal);
        this.qa[css_index] = Array(ns).fill(q);
    }

    evaluate() {
        const j = this.game.judge(this.s);
        if (j !== 0) return j;
        return this.game.playout(this.s);
    }

    solution() {
        const naArr = this.na[-1];
        return this.sa[naArr.indexOf(Math.max(...naArr))];
    }
}

export class mtcs {
    static game = null;
    static exp_limit = 8;
    static cp = 1.0;
    static css = [];

    static find(s) {
        for (const csi of mtcs.css) {
            if (mtcs.game.compare(csi.s, s)) return csi;
        }
        const newState = new State(mtcs.game, s);
        newState.set_css_index(mtcs.css.length);
        mtcs.css.push(newState);
        return newState;
    }

    static next_ai(state, n = 7000) {
        console.log(state)
        // const cs = new State(mtcs.game, mtcs.game.str2state(state["data"]), true);
        const cs = new State(mtcs.game, state, true);
        cs.set_css_index(0);
        mtcs.css = [cs];

        for (let epoch = 0; epoch < n; epoch++) {
            cs.select();
        }
        return cs.solution();
    }
}
