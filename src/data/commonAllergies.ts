export type CommonAllergy = {
  id: number
  key: string
  name: string
  ja: string
  mandatory: boolean
  image?: string
}

export const COMMON_ALLERGIES: CommonAllergy[] = [
  // Mandatory
  { id: 1, key: 'shrimp',    name: 'Shrimp',    ja: 'えび', mandatory: true, image: '/A1.png' },
  { id: 2, key: 'crab',      name: 'Crab',      ja: 'かに', mandatory: true, image: '/A2.png' },
  { id: 3, key: 'walnut',    name: 'Walnut',    ja: 'くるみ', mandatory: true, image: '/A3.png' },
  { id: 4, key: 'wheat',     name: 'Wheat',     ja: '小麦', mandatory: true, image: '/A4.png' },
  { id: 5, key: 'buckwheat', name: 'Buckwheat', ja: 'そば', mandatory: true, image: '/A5.png' },
  { id: 6, key: 'egg',       name: 'Egg',       ja: '卵', mandatory: true, image: '/A6.png' },
  { id: 7, key: 'milk',      name: 'Milk',      ja: '乳', mandatory: true, image: '/A7.png' },
  { id: 8, key: 'peanut',    name: 'Peanut',    ja: '落花生（ピーナッツ）', mandatory: true, image: '/A8.png' },

  // Optional
  { id: 9,  key: 'almond',     name: 'Almond',        ja: 'アーモンド', mandatory: false, image: '/A9.png' },
  { id: 10, key: 'abalone',    name: 'Abalone',       ja: 'あわび', mandatory: false, image: '/A10.png' },
  { id: 11, key: 'squid',      name: 'Squid',         ja: 'いか', mandatory: false, image: '/A11.png' },
  { id: 12, key: 'salmon-roe', name: 'Salmon Roe',    ja: 'いくら', mandatory: false, image: '/A12.png' },
  { id: 13, key: 'orange',     name: 'Orange',        ja: 'オレンジ', mandatory: false, image: '/A13.png' },
  { id: 14, key: 'cashew',     name: 'Cashew Nut',    ja: 'カシューナッツ', mandatory: false, image: '/A14.png' },
  { id: 15, key: 'kiwi',       name: 'Kiwi Fruit',    ja: 'キウイフルーツ', mandatory: false, image: '/A15.png' },
  { id: 16, key: 'beef',       name: 'Beef',          ja: '牛肉', mandatory: false, image: '/A16.png' },
  { id: 17, key: 'sesame',     name: 'Sesame',        ja: 'ごま', mandatory: false, image: '/A17.png' },
  { id: 18, key: 'salmon',     name: 'Salmon',        ja: 'さけ', mandatory: false, image: '/A18.png' },
  { id: 19, key: 'mackerel',   name: 'Mackerel',      ja: 'さば', mandatory: false, image: '/A19.png' },
  { id: 20, key: 'soy',        name: 'Soy',           ja: '大豆', mandatory: false, image: '/A20.png' },
  { id: 21, key: 'chicken',    name: 'Chicken',       ja: '鶏肉', mandatory: false, image: '/A21.png' },
  { id: 22, key: 'banana',     name: 'Banana',        ja: 'バナナ', mandatory: false, image: '/A22.png' },
  { id: 23, key: 'pork',       name: 'Pork',          ja: '豚肉', mandatory: false, image: '/A23.png' },
  { id: 24, key: 'matsutake',  name: 'Matsutake',     ja: 'まつたけ', mandatory: false, image: '/A24.png' },
  { id: 25, key: 'peach',      name: 'Peach',         ja: 'もも', mandatory: false, image: '/A25.png' },
  { id: 26, key: 'yam',        name: 'Yam',           ja: 'やまいも', mandatory: false, image: '/A26.png' },
  { id: 27, key: 'apple',      name: 'Apple',         ja: 'りんご', mandatory: false, image: '/A27.png' },
  { id: 28, key: 'gelatin',    name: 'Gelatin',       ja: 'ゼラチン', mandatory: false, image: '/A28.png' },
]



