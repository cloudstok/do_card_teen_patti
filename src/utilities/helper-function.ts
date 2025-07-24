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

const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const suits = ['D', 'H', 'C', 'S'];

function generateDeck(): string[] {
  const deck: string[] = []
  for (let i = 0; i < suits.length; i++) {
    for (let j = 0; j < values.length; j++) {
      deck.push(`${values[j]}-${suits[i]}`)
    }
  }
  return shuffleDeck(deck);
}

function shuffleDeck(deck: string[]): string[] {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}


function getRandomCardValues(): { player1: string[], player2: string[] } {

  const shuffledDeck = generateDeck().slice(0, 4);
  const player1: string[] = [];
  const player2: string[] = []

  shuffledDeck.forEach((card, i) => {
    if (i % 2 == 0) player1.push(card)
    else player2.push(card)
  });

  return { player1, player2 }
}

interface GameResult {
  1: string[],
  2: string[],
  winner: 1 | 2 | 3
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
    "2,A" // special case
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

  if (hand1.secondHighValue > hand2.secondHighValue) return 1;
  if (hand1.secondHighValue < hand2.secondHighValue) return 2;

  if (hand1.highSuit > hand2.highSuit) return 1;
  if (hand1.highSuit < hand2.highSuit) return 2;

  if (hand1.secondHighSuit > hand2.secondHighSuit) return 1;
  if (hand1.secondHighSuit < hand2.secondHighSuit) return 2;

  return 3; // Tie
}

export const getResult = (): GameResult => {

  const result: GameResult = {
    1: [],
    2: [],
    winner: 3
  };

  const { player1, player2 } = getRandomCardValues();
  result[1] = player1;
  result[2] = player2;

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