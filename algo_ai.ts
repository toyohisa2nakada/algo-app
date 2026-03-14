

// compile
// npx tsc algo_ai.ts --target esnext --module esnext --moduleResolution bundler --watch

// server (自動更新)
// npx browser-sync start --server --index "algo_online.html" --files "*.html, *.js"

type Card = {
    id: string,
    value: number,
    color: string,
    isFaceUp: boolean
}
type State = {
    playerIndex: number,
    playerHands: Card[][],
}


class Game {
    judge() {
        return 0;
    }
}

export function next_ai(state: State) {
    console.log("in typescript ", state)
    return;
}
