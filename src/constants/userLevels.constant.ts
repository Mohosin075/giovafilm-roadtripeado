export interface IUserLevelConfig {
  level: number
  name: string
  points: number
  reviews: number
}

export const USER_LEVELS: IUserLevelConfig[] = [
  { level: 0, name: 'Explorador', points: 0, reviews: 0 },
  { level: 1, name: 'Aventurero', points: 100, reviews: 6 },
  { level: 2, name: 'Tlacuilo', points: 200, reviews: 13 },
  { level: 3, name: 'Expedicionario', points: 400, reviews: 26 },
  { level: 4, name: 'Viajero', points: 700, reviews: 46 },
  { level: 5, name: 'Chasqui', points: 1300, reviews: 86 },
  { level: 6, name: 'Cronista', points: 2200, reviews: 146 },
  { level: 7, name: 'Baquiano', points: 3500, reviews: 233 },
  { level: 8, name: 'Cartógrafo', points: 5500, reviews: 366 },
  { level: 9, name: 'Maestro Ruta', points: 8500, reviews: 566 },
  { level: 10, name: 'Leyenda', points: 13000, reviews: 866 },
  { level: 11, name: 'Gran Leyenda', points: 20000, reviews: 1333 },
  { level: 12, name: 'Mítico', points: 30000, reviews: 2000 },
  { level: 13, name: 'Inmortal', points: 45000, reviews: 3000 },
  { level: 14, name: 'Supremo', points: 65000, reviews: 4333 },
]

export const calculateUserLevel = (points: number, approvedReviews: number): number => {
  let level = 0
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (points >= USER_LEVELS[i].points && approvedReviews >= USER_LEVELS[i].reviews) {
      level = USER_LEVELS[i].level
      break
    }
  }
  return level
}
