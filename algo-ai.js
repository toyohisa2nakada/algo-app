// compile
// npx tsc algo-ai.ts --target esnext --module esnext --moduleResolution bundler --watch
// server (自動更新)
// npx browser-sync start --server --index "algo-app.html" --files "*.html, *.js"
const PLAYER_IDS = [-1, 1];
const CARD_COLORS = ["black", "white"];
const CARD_NUMBERS = [...Array(12).keys()];
const ACTION_TYPES = ["attack", "stay"];
class Game {
    judge(state) {
        return 0;
    }
    is_finished(state) {
        // ToDo: 山札がなくなったとき、手札の裏のカードを使ってアタックする、というのがalgo-app.htmlの方で実装されていない。よってとりあえず、山札無くなったら終わり
        // return Object.values(state.playerHands).every(cards => cards.some(card => !card.isFaceUp))
        return state.deck.length === 0;
    }
    compare(state0, state1) {
        return JSON.stringify(state0) === JSON.stringify(state1);
    }
    actions(state) {
        const targetCards = state.playerHands[state.currentEnemyId].filter((e) => !e.isFaceUp);
        const remainedCardNumbers = CARD_COLORS.reduce((a, color) => {
            const opened = Object.entries(state.playerHands).flatMap(([playerId, cards]) => {
                const isMe = Number(playerId) === state.currentPlayerId;
                return cards.filter(card => card.color === color && (isMe || card.isFaceUp)).map(card => card.number);
            });
            const remained = CARD_NUMBERS.filter(e => !opened.includes(e));
            return { ...a, [color]: remained };
        }, {});
        // ToDo: cardの並び順でありえない数字、また、自分と相手がコールした数字をここでは考慮していない。
        // ToDo: 山札から引いたカード(drawnCard)をアタック失敗で相手にさらすリスクについても試算していない
        // console.log(state);
        // console.log(targetCards.flatMap(card => remainedCardNumbers[card.color].map(n => ({ targetCard: card, targetNumber: n }))))
        const actions = targetCards.flatMap(card => remainedCardNumbers[card.color].map(n => ({ type: "attack", targetCard: card, targetNumber: n })));
        if (state.firstAttack === false) {
            actions.push({ type: "stay" });
        }
        return actions;
    }
    move(state, action) {
        const state2 = JSON.parse(JSON.stringify(state));
        state2.called[state2.currentPlayerId].push(action);
        if (action.type === "attack") {
            if (action.targetCard.number === action.targetNumber) {
                state2.playerHands[state2.currentEnemyId].filter(card => card.id === action.targetCard.id)[0].isFaceUp = true;
                state2.firstAttack = false;
            }
            else {
                state2.playerHands[state2.currentPlayerId].filter(card => card.id === state2.drawnCard.id)[0].isFaceUp = true;
                Game.addCardToHand(state2, state2.deck.pop());
                state2.currentPlayerId = state.currentEnemyId;
                state2.currentEnemyId = state.currentPlayerId;
            }
        }
        else if (action.type === "stay") {
            state2.currentPlayerId = state.currentEnemyId;
            state2.currentEnemyId = state.currentPlayerId;
        }
        // console.log("move", action);
        return state2;
    }
    playout(state) {
        return 0.0;
    }
    // 新しく引いたカードを盤面状態に反映する(破壊的操作)。
    static addCardToHand(state, drawnCard) {
        const pushAndSort = (card, hand) => [...hand, card].sort((e0, e1) => e0.number === e1.number ? (e0.color === "black" ? -1 : 1) : e0.number - e1.number);
        if (drawnCard) {
            const hand = state.playerHands[state.currentPlayerId];
            state.playerHands[state.currentPlayerId] = pushAndSort(drawnCard, hand);
        }
        state.drawnCard = drawnCard;
        state.firstAttack = true;
        return state;
    }
}
function next_ai_random(state) {
    const targets = state.playerHands[state.currentEnemyId].filter(c => !c.isFaceUp);
    return targets[Math.floor(Math.random() * targets.length)];
}
import { mtcs } from "./mtcs.js";
mtcs.game = new Game();
export function next_ai(state, drawnCard) {
    state.called = PLAYER_IDS.reduce((a, e) => ({ ...a, [e]: [] }), {});
    // return next_ai_random(state);
    return mtcs.next_ai(Game.addCardToHand(state, drawnCard));
}
