export const POKEMON_NAMES = [
  '피카츄', '이상해씨', '파이리', '꼬부기', '푸린', '잠만보', '갸라도스', '뮤츠',
  '뮤', '망나뇽', '독침붕', '피죤투', '또가스', '고오스', '팬텀', '나옹',
  '메타몽', '고라파덕', '토네코일', '캥카', '럭키', '잉어킹', '망키', '미뇽',
  '식스테일', '나인테일', '루주라', '두두', '두트리오', '깨비참', '깨비드릴조', '아라리',
  '해피너스', '샤미드', '냐오닉스', '쥬쥬', '쥬레곤', '치코리타', '뿔카노', '리자몽',
];

/** Fisher–Yates shuffle, returns a new array */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createPokemonPool(): string[] {
  return shuffle(POKEMON_NAMES);
}
