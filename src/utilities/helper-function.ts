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
  const suits = ['D', 'C', 'H', 'S']; // Lowest to highest

  function getCardInfo(card: string) {
    const [value, suit] = card.split('-');
    return { value, suit };
  }

  // const sequenceRanks: Record<string, number> = {
  //   "Q,K": 1, "A,2": 2, "J,Q": 3, "10,J": 4, "9,10": 5, "8,9": 6, "7,8": 7, "6,7": 8,
  //   "5,6": 9, "4,5": 10, "3,4": 11, "2,3": 12
  // };
  const sequenceRanks: Record<string, number> = {
    "Q,K": 1, "K,Q": 1,
    "A,2": 2, "2,A": 2,
    "J,Q": 3, "Q,J": 3,
    "10,J": 4, "J,10": 4,
    "9,10": 5, "10,9": 5,
    "8,9": 6, "9,8": 6,
    "7,8": 7, "8,7": 7,
    "6,7": 8, "7,6": 8,
    "5,6": 9, "6,5": 9,
    "4,5": 10, "5,4": 10,
    "3,4": 11, "4,3": 11,
    "2,3": 12, "3,2": 12
  };


  function evaluateHand(cards: string[]): { rank: number, highValue: number, highSuit: number } {
    const c1 = getCardInfo(cards[0]);
    const c2 = getCardInfo(cards[1]);

    const v1 = values.indexOf(c1.value);
    const v2 = values.indexOf(c2.value);
    const s1 = suits.indexOf(c1.suit);
    const s2 = suits.indexOf(c2.suit);

    // Trio
    if (c1.value === c2.value) {
      return { rank: 1, highValue: v1, highSuit: Math.max(s1, s2) };
    }

    const sortedPair = [c1.value, c2.value].sort((a, b) => values.indexOf(a) - values.indexOf(b)).join(',');

    if (sequenceRanks[sortedPair] !== undefined) {
      const seqRank = sequenceRanks[sortedPair];
      const baseRank = (c1.suit === c2.suit) ? 2 : 3;
      return { rank: baseRank, highValue: seqRank, highSuit: Math.max(s1, s2) };
    }

    // Colour
    if (c1.suit === c2.suit) {
      return { rank: 4, highValue: Math.max(v1, v2), highSuit: Math.max(s1, s2) };
    }

    // High Card
    return { rank: 5, highValue: Math.max(v1, v2), highSuit: Math.max(s1, s2) };
  }

  const hand1 = evaluateHand(card1);
  const hand2 = evaluateHand(card2);

  if (hand1.rank < hand2.rank) return 1;
  if (hand1.rank > hand2.rank) return 2;

  if (hand1.rank === 3 && hand2.rank === 3) {
    if (hand1.highValue > hand2.highValue) return 2;
    if (hand1.highValue < hand2.highValue) return 1;
  }


  if (hand1.highValue > hand2.highValue) return 1;
  if (hand1.highValue < hand2.highValue) return 2;

  if (hand1.highSuit > hand2.highSuit) return 1;
  if (hand1.highSuit < hand2.highSuit) return 2;

  return 3; // tie
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
  // result[1] = ['7-C', '9-C'];
  // result[2] = ['A-C', '2-S'];


  result['winner'] = compareCards(result[1], result[2]);
  // console.log('result', result);
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
    mult: (chip === 1 || chip === 2) ? 1.98 : 0.5,
    status: 'loss'
  };

  if (chip === result) {
    resultData.status = 'win';
    resultData.winAmount = betAmount * resultData.mult;
  }

  return resultData;
};