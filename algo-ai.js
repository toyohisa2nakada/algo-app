// compile
// npx tsc algo-ai.ts --target esnext --module esnext --moduleResolution bundler --watch
class Game {
    judge() {
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
import { mtcs } from "./mtcs.js";
mtcs.game = new Game();
export function next_ai(state) {
    const enemyPlayerId = state.currentPlayerIndex * -1;
    const targets = state.playerHands[enemyPlayerId].filter(c => !c.isFaceUp);
    return targets[Math.floor(Math.random() * targets.length)];
}
