
// typescriptのインストール
//  npm install --save-dev typescript
// tsconfig.jsonの作成
//  npx tsc --init
// browser-syncのインストール
// npm install --save-dev browser-sync

// compile (tsconfig.jsonを使う)
// npx tsc --watch

// server (自動更新)
// npx browser-sync start --server --index "algo-app.html" --files "*.html, *.js"

// 参考文献
// Mastering Da Vinci Code: A Comparative Study of Transformer, LLM, and PPO-based Agents
// https://arxiv.org/abs/2506.12801
//
// ボードゲーム『アルゴ』における平均情報量を用いた行動選択アルゴリズムの提案
// https://qiita.com/guglilac/items/7c08a1e6c619b40179ca


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
    probability: number;
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

function getSequences(state: State): { possibleNumbers: number[][], sequences: number[][], counts: { [card_i: number]: number }[] | undefined } {
    // カードの数値は、黒は*2、白は*2+1として扱う
    const toSerial = (value: number, color: "black" | "white") => value * 2 + (color === "black" ? 0 : 1);
    const toNumber = (serial: number, color: "black" | "white") => (serial - (color === "black" ? 0 : 1)) / 2;
    const openedCardNumbers = [
        ...state.playerHands[state.currentPlayerId],
        ...state.playerHands[state.currentEnemyId].filter(card => card.isFaceUp)
    ].map((card) => toSerial(card.number, card.color));

    const targetHand = state.playerHands[state.currentEnemyId];
    const possibleSerialNumbers: number[][] = [...Array(targetHand.length)];
    let value = 0;
    for (let card_i = 0; card_i < targetHand.length; card_i += 1) {
        const card = targetHand[card_i]!;
        const called = state.called ? state.called[state.currentPlayerId].filter(action => action.targetCard?.id === card.id).
            map(action => toSerial(action.targetNumber!, action.targetCard!.color)) : [];
        if (card.isFaceUp) {
            possibleSerialNumbers[card_i]! = [toSerial(card.number, card.color)];
        } else {
            possibleSerialNumbers[card_i]! = CARD_NUMBERS.flatMap(v => [v * 2, v * 2 + 1]).filter(v =>
                v >= value && v % 2 === (card.color === "black" ? 0 : 1) &&
                !openedCardNumbers.includes(v) && !called.includes(v)
            );
        }
        value = possibleSerialNumbers[card_i]![0]! + 1;
    }
    value = CARD_NUMBERS.at(-1)! * 2 + 1;
    for (let card_i = targetHand.length - 1; card_i >= 0; card_i -= 1) {
        const card = targetHand[card_i]!;
        if (!card.isFaceUp) {
            possibleSerialNumbers[card_i]! = possibleSerialNumbers[card_i]!.filter(v => v <= value);
        }
        value = possibleSerialNumbers[card_i]!.at(-1)! - 1;
    }

    type Node = {
        parentNode: Node | null;
        number: number;
        card_i: number;
    }
    const open: Node[] = possibleSerialNumbers[0]!.map(e => ({ parentNode: null, card_i: 0, number: e }));
    const sequences: number[][] = [];
    while (open.length !== 0) {
        const n = open.shift()!;
        if (n.card_i === targetHand.length - 1) {
            const sequence = [];
            for (let l: Node | null = n; l; l = l.parentNode) {
                sequence.unshift(l.number);
            }
            sequences.push(sequence.map((v, card_i) => toNumber(v, targetHand[card_i]!.color)));
        } else {
            open.push(...possibleSerialNumbers[n.card_i + 1]!.filter(e => e > n.number).
                map(e => ({ parentNode: n, card_i: n.card_i + 1, number: e })));
        }
    }
    const counts = sequences[0]?.map((_, i) =>
        sequences.reduce((acc, seq) => {
            const val = seq[i]!;
            acc[val] = (acc[val] || 0) + 1;
            return acc;
        }, {} as { [card_i: number]: number })
    );
    // console.log("possibleSerialNumbers",possibleSerialNumbers);
    // console.log("sequences", sequences);
    // console.log("counts", counts);
    const possibleNumbers = possibleSerialNumbers.map((serials, card_i) => serials.map(v => toNumber(v, targetHand[card_i]!.color)));

    return { possibleNumbers, sequences, counts };
}

function getActions(state: State): Action[] {
    const targetHand = state.playerHands[state.currentEnemyId];
    const { possibleNumbers, sequences, counts } = getSequences(state);
    return targetHand.map((card, card_i) => [card, possibleNumbers[card_i], card_i]).filter(e => !(e[0]! as Card).isFaceUp).
        flatMap(([card, p_numbers, card_i]) => (p_numbers! as number[]).
            map(v => ({ type: "attack", targetCard: card, targetNumber: v, probability: counts![card_i as number]![v]! / sequences.length } as Action)));
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
        // ToDo: 山札から引いたカード(drawnCard)をアタック失敗で相手にさらすリスクについても試算していない
        const actions: Action[] = getActions(state);
        if (state.firstAttack === false) {
            actions.push({ type: "stay", probability: 0.4 });
        }
        actions.sort((e0, e1) => e1.probability - e0.probability)
        // console.log("actions", actions);
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
    static addCardToHand(state: State, drawnCard: Card | undefined = undefined, firstAttack: boolean | undefined = undefined): State {
        const pushAndSort = (card: Card, hand: Card[]) =>
            [...hand, card].sort((e0, e1) => e0.number === e1.number ? (e0.color === "black" ? -1 : 1) : e0.number - e1.number);
        if (drawnCard) {
            const hand = state.playerHands[state.currentPlayerId];
            state.playerHands[state.currentPlayerId] = pushAndSort(drawnCard, hand);
        }
        state.drawnCard = drawnCard;
        state.firstAttack = firstAttack ?? true;
        return state;
    }
}

function next_ai_random(state: State): Action {
    const actions = mtcs.game.actions(state);
    // console.log(actions);
    // return actions[Math.floor(actions.length * Math.random())];
    return actions[0];
}

import { mtcs } from "./mtcs.js";
mtcs.game = new Game();
let global_called: Record<PlayerId, Action[]> | null = null;

export function init_game() {
    global_called = PLAYER_IDS.reduce((a, e) => ({ ...a, [e]: [] }), {} as Record<PlayerId, Action[]>);
}
export function human() {
    return;
}
export function next_ai(state: State, drawnCard: Card, firstAttack: boolean = true): Action {
    if (global_called === null) {
        throw new Error("please call init_game function before calling next_ai");
    }
    state.called = global_called;
    // AIにとって自分のカードを手札に含めてから処理を実行する(Game.addCardToHand)。
    const a = next_ai_random(Game.addCardToHand(state, drawnCard, firstAttack));
    // const a = mtcs.next_ai(Game.addCardToHand(state, drawnCard), state.currentPlayerId, 500);
    global_called[state.currentPlayerId].push(a);
    return a;
}

export function getAdvantages(state: State): { [playerId: number]: number } {
    // if (global_called === null) {
    //     throw new Error("please call init_game function before calling next_ai");
    // }
    // state.called = global_called;

    console.log("player", JSON.stringify(state.playerHands[1].map(e => [e.id, e.isFaceUp])));
    console.log("enemy ", JSON.stringify(state.playerHands[-1].map(e => [e.id, e.isFaceUp])));

    let sum = 0;
    const sequencesLengthes = PLAYER_IDS.map(playerId => {
        state.currentEnemyId = playerId;
        state.currentPlayerId = playerId * -1 as PlayerId;
        const { sequences } = getSequences(state);
        sum += sequences.length;
        console.log(playerId, sequences)
        return sequences.length;
    })
    console.log("----------------");
    return PLAYER_IDS.reduce((a, e, i) => ({ ...a, [e]: sequencesLengthes[i] }), { sum });
}
