

// compile
// npx tsc algo-ai.ts --target esnext --module esnext --moduleResolution bundler --watch

// server (自動更新)
// npx browser-sync start --server --index "algo-app.html" --files "*.html, *.js"

const PLAYER_IDS = [-1, 1] as const;
type PlayerId = typeof PLAYER_IDS[number];
const CARD_COLORS = ["black", "white"] as const;
type CardColor = typeof CARD_COLORS[number];
const CARD_NUMBERS = [...Array(12).keys()] as const;
type CardNumber = typeof CARD_NUMBERS[number];
type Card = {
    id: string;
    number: CardNumber;
    color: CardColor;
    isFaceUp: boolean;
}
const ACTION_TYPES = ["attack", "stay"];
type ActionType = typeof ACTION_TYPES[number];
type Action = {
    type: ActionType;
    targetCard?: Card;
    targetNumber?: number;
}
type State = {
    currentPlayerId: PlayerId;
    currentEnemyId: PlayerId;
    playerHands: Record<PlayerId, Card[]>;
    drawnCard: Card | undefined;
    deck: Card[];
    firstAttack: boolean;
    called: Record<PlayerId, Action[]>;
}

class Game {
    judge(state: State) {
        return PLAYER_IDS.reduce((judge, id) => state.playerHands[id].every(card => card.isFaceUp) ? id * -1 : judge, 0);
    }
    is_finished(state: State) {
        // ToDo: 山札がなくなったとき、手札の裏のカードを使ってアタックする、というのがalgo-app.htmlの方で実装されていない。よってとりあえず、山札無くなったら終わり
        // return Object.values(state.playerHands).every(cards => cards.some(card => !card.isFaceUp))
        return state.deck.length === 0;
    }
    compare(state0: State, state1: State): boolean {
        return JSON.stringify(state0) === JSON.stringify(state1);
    }
    actions(state: State): Action[] {
        const targetCards = state.playerHands[state.currentEnemyId].filter((e: Card) => !e.isFaceUp);
        const remainedCardNumbers = CARD_COLORS.reduce((a, color) => {
            const opened = Object.entries(state.playerHands).flatMap(([playerId, cards]) => {
                const isMe = Number(playerId) === state.currentPlayerId;
                return (cards as Card[]).filter(card => card.color === color && (isMe || card.isFaceUp)).map(card => card.number);
            });
            const remained = CARD_NUMBERS.filter(e => !opened.includes(e));
            return { ...a, [color as CardColor]: remained }
        }, {} as Record<CardColor, number[]>);
        // ToDo: cardの並び順でありえない数字、また、自分と相手がコールした数字をここでは考慮していない。
        // ToDo: 山札から引いたカード(drawnCard)をアタック失敗で相手にさらすリスクについても試算していない
        // console.log(state);
        // console.log(targetCards.flatMap(card => remainedCardNumbers[card.color].map(n => ({ targetCard: card, targetNumber: n }))))
        const actions: Action[] = targetCards.flatMap(card => remainedCardNumbers[card.color].map(n => ({ type: "attack", targetCard: card, targetNumber: n })));
        if (state.firstAttack === false) {
            actions.push({ type: "stay" });
        }
        return actions;
    }
    move(state: State, action: Action): State {
        const state2 = JSON.parse(JSON.stringify(state)) as State;
        state2.called[state2.currentPlayerId].push(action);
        if (action.type === "attack") {
            if (action.targetCard!.number === action.targetNumber) {
                state2.playerHands[state2.currentEnemyId].filter(card => card.id === action.targetCard!.id)[0]!.isFaceUp = true;
                state2.firstAttack = false;
            } else {
                // console.log("++ state",state2)
                // console.log("++ action",action)
                state2.playerHands[state2.currentPlayerId].filter(card => card.id === state2.drawnCard!.id)[0]!.isFaceUp = true;
                state2.currentPlayerId = state.currentEnemyId;
                state2.currentEnemyId = state.currentPlayerId;
                Game.addCardToHand(state2, state2.deck.pop());
            }
        } else if (action.type === "stay") {
            // console.log("stay")
            state2.currentPlayerId = state.currentEnemyId;
            state2.currentEnemyId = state.currentPlayerId;
            Game.addCardToHand(state2, state2.deck.pop());
        }
        // console.log("move", action);
        return state2;
    }
    playout(state: State) {
        while (true) {
            const actions = mtcs.game.actions(state);
            const targetAction = actions[Math.floor(actions.length * Math.random())];
            const state2 = mtcs.game.move(state, targetAction);
            const judge = mtcs.game.judge(state2);
            if (judge !== 0) {
                return judge;
            }
            if (mtcs.game.is_finished(state2)) {
                return 0.0;
            }
            state = state2;
        }
    }

    // 新しく引いたカードを盤面状態に反映する(破壊的操作)。
    static addCardToHand(state: State, drawnCard: Card | undefined): State {
        const pushAndSort = (card: Card, hand: Card[]) =>
            [...hand, card].sort((e0, e1) => e0.number === e1.number ? (e0.color === "black" ? -1 : 1) : e0.number - e1.number);
        if (drawnCard) {
            const hand = state.playerHands[state.currentPlayerId];
            state.playerHands[state.currentPlayerId] = pushAndSort(drawnCard, hand);
        }
        state.drawnCard = drawnCard;
        state.firstAttack = true;
        return state;
    }
}

function next_ai_random(state: State): Action {
    // const targets = state.playerHands[state.currentEnemyId].filter(c => !c.isFaceUp);
    // return { type: "attack", targetCard: targets[Math.floor(Math.random() * targets.length)]!, targetNumber: Math.floor(Math.random() * 12) };
    const actions = mtcs.game.actions(state);
    return actions[Math.floor(actions.length * Math.random())];
}

import { mtcs } from "./mtcs.js";
mtcs.game = new Game();

export function next_ai(state: State, drawnCard: Card): Action {
    state.called = PLAYER_IDS.reduce((a, e) => ({ ...a, [e]: [] }), {} as Record<PlayerId, Action[]>)
    // return next_ai_random(state);
    const b = next_ai_random(Game.addCardToHand(state, drawnCard));
    const a = mtcs.next_ai(Game.addCardToHand(state, drawnCard), state.currentPlayerId, 500);
    console.log(a, b);
    return a;
}
