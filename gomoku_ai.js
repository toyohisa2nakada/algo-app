const params = { length: 8, n_pieces: 4 };

// 勝者判定
function judge(cells, length = params.length, n_pieces = params.n_pieces) {
    const xy2i = (p) => p[1] * length + p[0];
    const is_in = (p) => p[0] >= 0 && p[0] < length && p[1] >= 0 && p[1] < length;

    const index = [...Array(length).keys()];
    const xindex0 = Array.from({ length: 2 * length - 2 * n_pieces + 1 }, (_, i) => i - length + n_pieces);
    const xindex1 = Array.from({ length: 2 * length - 2 * n_pieces + 1 }, (_, i) => i + n_pieces - 1);

    const lines = [
        // 縦
        ...index.map(x => index.map(y => [x, y])),
        // 横
        ...index.map(y => index.map(x => [x, y])),
        // 右下がり斜め
        ...xindex0.map(x => index.map(y => [x + y, y]).filter(is_in)),
        // 左下がり斜め
        ...xindex1.map(x => index.map(y => [x - y, y]).filter(is_in)),
    ];

    for (const line of lines) {
        const values = line.map(p => cells[xy2i(p)]);
        // groupby相当: 連続する同じ値をグループ化
        let count = 1;
        for (let i = 1; i < values.length; i++) {
            if (values[i] === values[i - 1]) {
                count++;
                if (count >= n_pieces && values[i] !== 0) return values[i];
            } else {
                count = 1;
            }
        }
    }
    return 0;
}

// 同一盤面チェック
class cell_comparator {
    constructor(length) {
        this.length = length;
        this.indexes = [];

        const base = [...Array(length ** 2).keys()];
        this.indexes.push(base);

        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 3; j++) {
                this.indexes.push(this.rotate(this.indexes[this.indexes.length - 1]));
            }
            if (i === 0) {
                this.indexes.push(this.flip(this.indexes[0]));
            }
        }
    }

    xy2i(x, y) {
        return y * this.length + x;
    }

    rotate(index) {
        const result = [];
        for (let y = 0; y < this.length; y++)
            for (let x = 0; x < this.length; x++)
                result.push(index[this.xy2i(y, this.length - 1 - x)]);
        return result;
    }

    flip(index) {
        const result = [];
        for (let y = 0; y < this.length; y++)
            for (let x = 0; x < this.length; x++)
                result.push(index[this.xy2i(this.length - 1 - x, y)]);
        return result;
    }

    compare(cells0, cells1) {
        for (const index of this.indexes) {
            let same = true;
            for (let i0 = 0; i0 < index.length; i0++) {
                if (cells0[i0] !== cells1[index[i0]]) { same = false; break; }
            }
            if (same) return true;
        }
        return false;
    }
}

const comparator = new cell_comparator(params.length);

// Game クラス
class Game {
    judge(state) {
        return judge(state.cells);
    }

    compare(state0, state1) {
        return comparator.compare(state0.cells, state1.cells);
    }

    actions(state) {
        return state.cells
            .map((v, i) => v === 0 ? i : -1)
            .filter(i => i !== -1);
    }

    move(state, action) {
        const state2 = JSON.parse(JSON.stringify(state)); // deepcopy
        state2.cells[action] = state.p0_q;
        state2.p0_q = state.p0_q * -1;
        return state2;
    }

    playout(state) {
        const actions = this.actions(state);
        // shuffle
        for (let i = actions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [actions[i], actions[j]] = [actions[j], actions[i]];
        }
        let s2 = JSON.parse(JSON.stringify(state));
        for (const a of actions) {
            s2 = this.move(s2, a);
            const j = this.judge(s2);
            if (j !== 0) return j;
        }
        return 0.0;
    }

    // str2state(state_str) {
    //     return {
    //         cells: state_str.split(",").map(Number),
    //         p0_q: -1,
    //     };
    // }
}

import { mtcs } from "./mtcs.js";
mtcs.game = new Game();
export function next_ai(state){
    return mtcs.next_ai({cells:state.data,p0_q:-1});
}