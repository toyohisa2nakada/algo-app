// compile
// npx tsc algo-ai.ts --target esnext --module esnext --moduleResolution bundler --watch
// server (自動更新)
// npx browser-sync start --server --index "algo-app.html" --files "*.html, *.js"
const PLAYER_IDS = [-1, 1];
const CARD_COLORS = ["black", "white"];
const CARD_NUMBERS = [...Array(12).keys()];
const ACTION_TYPES = ["attack", "stay"];
function getActions(state) {
    const toSerial = (value, color) => value * 2 + (color === "black" ? 0 : 1);
    // カードの数値は、黒は*2、白は*2+1として扱う
    const remainedCardNumbers = [
        ...state.playerHands[state.currentPlayerId],
        ...state.playerHands[state.currentEnemyId].filter(card => card.isFaceUp)
    ].map((card) => toSerial(card.number, card.color));
    // console.log(remainedCardNumbers);
    const targetHand = state.playerHands[state.currentEnemyId];
    const possibleNumbers = [...Array(targetHand.length)];
    let value = 0;
    for (let card_i = 0; card_i < targetHand.length; card_i += 1) {
        const card = targetHand[card_i];
        const called = state.called[state.currentPlayerId].filter(action => action.targetCard?.id === card.id).
            map(action => toSerial(action.targetNumber, action.targetCard.color));
        if (card.isFaceUp) {
            possibleNumbers[card_i] = [toSerial(card.number, card.color)];
        }
        else {
            possibleNumbers[card_i] = CARD_NUMBERS.flatMap(v => [v * 2, v * 2 + 1]).filter(v => v >= value && v % 2 === (card.color === "black" ? 0 : 1) &&
                !remainedCardNumbers.includes(v) && !called.includes(v));
        }
        value = possibleNumbers[card_i][0] + 1;
    }
    value = CARD_NUMBERS.at(-1) * 2 + 1;
    for (let card_i = targetHand.length - 1; card_i >= 0; card_i -= 1) {
        const card = targetHand[card_i];
        if (!card.isFaceUp) {
            possibleNumbers[card_i] = possibleNumbers[card_i].filter(v => v <= value);
        }
        value = possibleNumbers[card_i].at(-1) - 1;
    }
    for (let card_i = 0; card_i < targetHand.length; card_i += 1) {
        const card = targetHand[card_i];
        possibleNumbers[card_i] = possibleNumbers[card_i].map(v => (v - (card.color === "black" ? 0 : 1)) / 2);
    }
    // console.log(possibleNumbers)
    return targetHand.map((card, card_i) => [card, possibleNumbers[card_i]]).filter(e => !e[0].isFaceUp).
        flatMap(([card, p_numbers]) => p_numbers.map(v => ({ type: "attack", targetCard: card, targetNumber: v })));
}
class Game {
    judge(state) {
        return PLAYER_IDS.reduce((judge, id) => state.playerHands[id].every(card => card.isFaceUp) ? id * -1 : judge, 0);
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
        // ToDo: 山札から引いたカード(drawnCard)をアタック失敗で相手にさらすリスクについても試算していない
        const actions = getActions(state);
        // console.log(actions)
        // const targetCards = state.playerHands[state.currentEnemyId].filter((e: Card) => !e.isFaceUp);
        // const remainedCardNumbers = CARD_COLORS.reduce((a, color) => {
        //     const opened = Object.entries(state.playerHands).flatMap(([playerId, cards]) => {
        //         const isMe = Number(playerId) === state.currentPlayerId;
        //         return (cards as Card[]).filter(card => card.color === color && (isMe || card.isFaceUp)).map(card => card.number);
        //     });
        //     const remained = CARD_NUMBERS.filter(e => !opened.includes(e));
        //     return { ...a, [color as CardColor]: remained }
        // }, {} as Record<CardColor, number[]>);
        // console.log(state);
        // console.log(targetCards.flatMap(card => remainedCardNumbers[card.color].map(n => ({ targetCard: card, targetNumber: n }))))
        // const actions: Action[] = targetCards.flatMap(card => remainedCardNumbers[card.color].map(n => ({ type: "attack", targetCard: card, targetNumber: n })));
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
                state2.currentPlayerId = state.currentEnemyId;
                state2.currentEnemyId = state.currentPlayerId;
                Game.addCardToHand(state2, state2.deck.pop());
            }
        }
        else if (action.type === "stay") {
            // console.log("stay")
            state2.currentPlayerId = state.currentEnemyId;
            state2.currentEnemyId = state.currentPlayerId;
            Game.addCardToHand(state2, state2.deck.pop());
        }
        // console.log("move", action);
        return state2;
    }
    playout(state) {
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
    const actions = mtcs.game.actions(state);
    return actions[Math.floor(actions.length * Math.random())];
}
import { mtcs } from "./mtcs.js";
mtcs.game = new Game();
let global_called = null;
export function init_game() {
    global_called = PLAYER_IDS.reduce((a, e) => ({ ...a, [e]: [] }), {});
}
export function next_ai(state, drawnCard) {
    if (global_called === null) {
        throw new Error("please call init_game function before calling next_ai");
    }
    state.called = global_called;
    // return next_ai_random(state);
    // const b = next_ai_random(Game.addCardToHand(state, drawnCard));
    const a = mtcs.next_ai(Game.addCardToHand(state, drawnCard), state.currentPlayerId, 500);
    // console.log(a, b);
    global_called[state.currentPlayerId].push(a);
    // console.log(b);
    return a;
}
