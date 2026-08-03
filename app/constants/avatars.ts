export const AVATARS = [
  { id: 'bear', label: 'Bär', src: '/avatars/bear.svg' },
  { id: 'fox', label: 'Fuchs', src: '/avatars/fox.svg' },
  { id: 'owl', label: 'Eule', src: '/avatars/owl.svg' },
  { id: 'frog', label: 'Frosch', src: '/avatars/frog.svg' },
  { id: 'cat', label: 'Katze', src: '/avatars/cat.svg' },
  { id: 'dog', label: 'Hund', src: '/avatars/dog.svg' },
] as const

export type AvatarId = (typeof AVATARS)[number]['id']
