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


function getRandomNumber(): number[] {
  return [Math.floor(Math.random() * 13) + 1, Math.floor(Math.random() * 13) + 1];
}



interface GameResult {
  1: string[],
  2: string[],
  winner: 1 | 2 | 3
}

function concatRandomSuit(val: number[]): string[] {
  const suits = ['D', 'H', 'C', 'S'];
  return [`${val[0]}-${suits[Math.floor(Math.random() * 4)]}`, `${val[1]}-${suits[Math.floor(Math.random() * 4)]}`]
}
function compareCards(card1: string[], card2: string[]): 1 | 2 | 3 {
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suits = ['S', 'H', 'C', 'D']; // Highest to lowest

  function getCardInfo(card: string) {
    const [value, suit] = card.split('-');
    return { value, suit };
  }

  function evaluateHand(cards: string[]): { rank: number, highValue: number, highSuit: number } {
    const c1 = getCardInfo(cards[0]);
    const c2 = getCardInfo(cards[1]);

    const v1 = values.indexOf(c1.value);
    const v2 = values.indexOf(c2.value);
    const s1 = suits.indexOf(c1.suit);
    const s2 = suits.indexOf(c2.suit);

    // Trio (both cards same value => trio of that value)
    if (c1.value === c2.value) {
      return { rank: 1, highValue: v1, highSuit: Math.max(s1, s2) };
    }

    // Pure Sequence (consecutive and same suit)
    if (Math.abs(v1 - v2) === 1 && c1.suit === c2.suit) {
      return { rank: 2, highValue: Math.max(v1, v2), highSuit: Math.max(s1, s2) };
    }

    // Check Sequence (based on custom chart)
    const combo = [c1.value, c2.value].sort((a, b) => values.indexOf(a) - values.indexOf(b)).join(',');
    const sequenceRanks: Record<string, number> = {
      "Q,K": 1, "A,2": 2, "J,Q": 3, "10,J": 4, "9,10": 5, "8,9": 6, "7,8": 7, "6,7": 8,
      "5,6": 9, "4,5": 10, "3,4": 11, "2,3": 12
    };

    if (sequenceRanks[combo] !== undefined) {
      return { rank: 3, highValue: sequenceRanks[combo], highSuit: Math.max(s1, s2) };
    }

    // Colour (both suits same)
    if (c1.suit === c2.suit) {
      return { rank: 4, highValue: Math.max(v1, v2), highSuit: s1 };
    }

    // High Card
    return { rank: 5, highValue: Math.max(v1, v2), highSuit: Math.max(s1, s2) };
  }

  const hand1 = evaluateHand(card1);
  const hand2 = evaluateHand(card2);

  // Compare rank first (lower is better)
  if (hand1.rank < hand2.rank) return 1;
  if (hand1.rank > hand2.rank) return 2;

  // If same rank, compare card value
  if (hand1.highValue > hand2.highValue) return 1;
  if (hand1.highValue < hand2.highValue) return 2;

  // If same value, compare suit
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

  const player1: number[] = getRandomNumber();
  const player2: number[] = getRandomNumber();
  result[1] = concatRandomSuit(player1);
  result[2] = concatRandomSuit(player2);
  result['winner'] = compareCards(result[1], result[2]);
  console.log('result', result);
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
    mult: 0.00,
    status: 'loss'
  };

  if (chip === result) {
    resultData.status = 'win';
    resultData.mult = (chip === 1 || chip === 2) ? 1.98 : 11;
    resultData.winAmount = betAmount * resultData.mult;
  }

  return resultData;
};