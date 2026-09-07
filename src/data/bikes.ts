export type BikeId = "scr" | "fixie" | "ttareungyi";

export type BikeSpec = {
  id: BikeId;
  name: string;
  kind: "로드" | "픽시" | "따릉이";
  maxKmh: number;
  accel: number;
  brake: number;
  turn: number;
  massFeel: number;
  blurb: string;
  photo?: string;
};

export const BIKES: BikeSpec[] = [
  {
    id: "scr",
    name: "Giant SCR",
    kind: "로드",
    maxKmh: 65,
    accel: 24,
    brake: 22,
    turn: 1.55,
    massFeel: 0.92,
    blurb: "가벼운 오렌지 로드바이크. 아라뱃길에서 여의도까지 가장 빠르게.",
    photo: `${import.meta.env.BASE_URL}bikes/road-scr.png`,
  },
  {
    id: "fixie",
    name: "Black Fixie",
    kind: "픽시",
    maxKmh: 65,
    accel: 22,
    brake: 18,
    turn: 1.62,
    massFeel: 0.88,
    blurb: "검은 픽시. 브레이크 후드 없이, 드리프트가 됩니다. 최고 65km/h.",
  },
  {
    id: "ttareungyi",
    name: "따릉이",
    kind: "따릉이",
    maxKmh: 36,
    accel: 14,
    brake: 16,
    turn: 1.15,
    massFeel: 1.35,
    blurb: "서울 공공자전거. 바구니와 펜더가 있고, 최고 36km/h.",
    photo: `${import.meta.env.BASE_URL}bikes/ttareungyi.png`,
  },
];

export function getBike(id: BikeId): BikeSpec {
  return BIKES.find((b) => b.id === id) ?? BIKES[0];
}
