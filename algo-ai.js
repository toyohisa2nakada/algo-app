// compile
// npx tsc algo-ai.ts --target esnext --module esnext --moduleResolution bundler --watch
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
function next_ai_random(state) {
    const targets = state.playerHands[state.currentEnemyId].filter(c => !c.isFaceUp);
    return targets[Math.floor(Math.random() * targets.length)];
}
import { mtcs } from "./mtcs.js";
mtcs.game = new Game();
export function next_ai(state) {
    // return next_ai_random(state);
    return mtcs.next_ai(state);
}
