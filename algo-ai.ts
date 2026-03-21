

// compile
// npx tsc algo-ai.ts --target esnext --module esnext --moduleResolution bundler --watch

// server (自動更新)
// npx browser-sync start --server --index "algo-app.html" --files "*.html, *.js"

type Card = {
    id: string,
    value: number,
    color: string,
    isFaceUp: boolean
}
type PlayerIndex = -1 | 1;
type State = {
    currentPlayerIndex: number,
    playerHands: Record<PlayerIndex, Card[]>;
}

class Game {
    judge(state) {
        return 0;
    }
    compare(state0, state1) {
        return false;
    }
    actions(state) {
        return null;
    }
    move(state, action) {
        return null;
    }
    playout(state) {
        return 0.0;
    }
}

function next_ai_random(state: State){
    const enemyPlayerId = state.currentPlayerIndex * -1 as PlayerIndex;
    const targets = state.playerHands[enemyPlayerId].filter(c => !c.isFaceUp);
    return targets[Math.floor(Math.random() * targets.length)];
}

import { mtcs } from "./mtcs.js";
mtcs.game = new Game();

export function next_ai(state: State) {
    // return next_ai_random(state);
    return mtcs.next_ai(state);
}
