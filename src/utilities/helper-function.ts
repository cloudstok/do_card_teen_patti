import { appConfig } from './app-config';
import { createLogger } from './logger';
import { Socket } from 'socket.io';

const failedBetLogger = createLogger('failedBets', 'jsonl');

export const logEventAndEmitResponse = (
  socket: Socket,
  req: any,
  res: string,
  event: string
): void => {
  const logData = JSON.stringify({ req, res });
  if (event === 'bet') {
    failedBetLogger.error(logData);
  }
  socket.emit('betError', { message: res, status: false },);
};

export const getUserIP = (socket: any): string => {
  const forwardedFor = socket.handshake.headers?.["x-forwarded-for"];
  if (forwardedFor) {
    const ip = forwardedFor.split(",")[0].trim();
    if (ip) return ip;
  }
  return socket.handshake.address || "";
};


function getRandomCardValues(): string[] {
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const card1 = values[Math.floor(Math.random() * values.length)];
  const card2 = values[Math.floor(Math.random() * values.length)];
  return [card1, card2];
}




interface GameResult {
  1: string[],
  2: string[],
  winner: 1 | 2 | 3
}


function concatRandomSuit(val: string[]): string[] {
  const suits = ['D', 'H', 'C', 'S'];
  return [`${val[0]}-${suits[Math.floor(Math.random() * 4)]}`, `${val[1]}-${suits[Math.floor(Math.random() * 4)]}`]
}


function compareCards(card1: string[], card2: string[]): 1 | 2 | 3 {
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['D', 'C', 'H', 'S']; // D < C < H < S

  function getCardInfo(card: string) {
    const [value, suit] = card.split('-');
    return { value, suit };
  }

  const sequenceRanks = new Set([
    "2,3",
    "3,4",
    "4,5",
    "5,6",
    "6,7",
    "7,8",
    "8,9",
    "9,10",
    "10,J",
    "J,Q",
    "Q,K",
    "A,2" // special case
  ]);

  function evaluateHand(cards: string[]) {
    const c1 = getCardInfo(cards[0]);
    const c2 = getCardInfo(cards[1]);

    const v1 = values.indexOf(c1.value);
    const v2 = values.indexOf(c2.value);
    const s1 = suits.indexOf(c1.suit);
    const s2 = suits.indexOf(c2.suit);

    const cardsSorted = [
      { value: v1, suit: s1 },
      { value: v2, suit: s2 }
    ].sort((a, b) => b.value - a.value);

    const valuePair = [c1.value, c2.value].sort((a, b) => values.indexOf(a) - values.indexOf(b)).join(',');

    // Trio (same number)
    if (c1.value === c2.value) {
      return {
        rank: 1,
        highValue: v1,
        secondHighValue: v2,
        highSuit: Math.max(s1, s2),
        secondHighSuit: Math.min(s1, s2)
      };
    }

    // Sequence or Pure Sequence
    if (sequenceRanks.has(valuePair)) {
      const baseRank = (c1.suit === c2.suit) ? 2 : 3;
      return {
        rank: baseRank,
        highValue: cardsSorted[0].value,
        secondHighValue: cardsSorted[1].value,
        highSuit: cardsSorted[0].suit,
        secondHighSuit: cardsSorted[1].suit
      };
    }

    // Colour (same suit)
    if (c1.suit === c2.suit) {
      return {
        rank: 4,
        highValue: cardsSorted[0].value,
        secondHighValue: cardsSorted[1].value,
        highSuit: cardsSorted[0].suit,
        secondHighSuit: cardsSorted[1].suit
      };
    }

    // High Card (default)
    return {
      rank: 5,
      highValue: cardsSorted[0].value,
      secondHighValue: cardsSorted[1].value,
      highSuit: cardsSorted[0].suit,
      secondHighSuit: cardsSorted[1].suit
    };
  }

  const hand1 = evaluateHand(card1);
  const hand2 = evaluateHand(card2);

  if (hand1.rank < hand2.rank) return 1;
  if (hand1.rank > hand2.rank) return 2;

  if (hand1.highValue > hand2.highValue) return 1;
  if (hand1.highValue < hand2.highValue) return 2;

  if (hand1.highSuit > hand2.highSuit) return 1;
  if (hand1.highSuit < hand2.highSuit) return 2;

  if (hand1.secondHighValue > hand2.secondHighValue) return 1;
  if (hand1.secondHighValue < hand2.secondHighValue) return 2;

  if (hand1.secondHighSuit > hand2.secondHighSuit) return 1;
  if (hand1.secondHighSuit < hand2.secondHighSuit) return 2;

  return 3; // Tie
}

export const getResult = (): GameResult => {

  const result: GameResult = {
    1: [],
    2: [],
    winner: 1
  };

  const player1: string[] = getRandomCardValues();
  const player2: string[] = getRandomCardValues();
  result[1] = concatRandomSuit(player1);
  result[2] = concatRandomSuit(player2);
  // result[1] = ['A-D', '10-S'];
  // result[2] = ['10-S', 'A-D'];


  result['winner'] = compareCards(result[1], result[2]);

  // Rank: Pair > Pure Sequence > Sequence > Colour > High Card


  return result;
};

type BetResult = {
  chip: number;
  betAmount: number;
  winAmount: number;
  mult: number;
  status: 'win' | 'loss';
};


export const getBetResult = (betAmount: number, chip: number, result: number): BetResult => {

  const resultData: BetResult = {
    chip,
    betAmount,
    winAmount: 0,
    mult: result == 3 ? 0.5 : 1.98,
    status: 'loss'
  };

  if (result == 3) {
    resultData.mult = 0.5;
    resultData.status = 'loss';
    resultData.winAmount = Math.min(betAmount * resultData.mult, appConfig.maxCashoutAmount);
  }
  if (chip === result) {
    resultData.mult = 1.98;
    resultData.status = 'win';
    resultData.winAmount = Math.min(betAmount * resultData.mult, appConfig.maxCashoutAmount);
  }

  return resultData;
};